/**
 * Cost Estimation Service
 * 
 * Estimates and tracks token usage and costs for LLM operations
 */

export interface CostEstimate {
  estimatedTokens: number;
  estimatedCost: number; // in USD
  breakdown: {
    operation: string;
    tokens: number;
    cost: number;
  }[];
}

export interface ModelPricing {
  inputTokensPerMillion: number; // Cost per 1M input tokens
  outputTokensPerMillion: number; // Cost per 1M output tokens
}

// Pricing for different models (as of 2026)
const MODEL_PRICING: Record<string, ModelPricing> = {
  "gpt-4.1-mini": {
    inputTokensPerMillion: 0.15,
    outputTokensPerMillion: 0.60,
  },
  "gpt-4.1-nano": {
    inputTokensPerMillion: 0.10,
    outputTokensPerMillion: 0.40,
  },
  "gemini-2.5-flash": {
    inputTokensPerMillion: 0.075,
    outputTokensPerMillion: 0.30,
  },
  "claude-3.5-sonnet": {
    inputTokensPerMillion: 3.0,
    outputTokensPerMillion: 15.0,
  },
  "gpt-4": {
    inputTokensPerMillion: 30.0,
    outputTokensPerMillion: 60.0,
  },
};

const DEFAULT_MODEL = "gpt-4.1-mini";

/**
 * Estimate tokens for text
 * Rule of thumb: ~4 characters per token for English text
 */
export function estimateTokens(text: string): number {
  // More accurate estimation: count words and characters
  const words = text.trim().split(/\s+/).length;
  const chars = text.length;
  
  // Average: 1 token ≈ 4 characters or 0.75 words
  const charBasedEstimate = chars / 4;
  const wordBasedEstimate = words / 0.75;
  
  // Use the average of both methods
  return Math.ceil((charBasedEstimate + wordBasedEstimate) / 2);
}

/**
 * Calculate cost for tokens
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string = DEFAULT_MODEL
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING[DEFAULT_MODEL];
  
  const inputCost = (inputTokens / 1_000_000) * pricing.inputTokensPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputTokensPerMillion;
  
  return inputCost + outputCost;
}

/**
 * Estimate cost for headline compilation
 */
export function estimateCompilationCost(
  headlineCount: number,
  averageHeadlineLength: number = 200,
  model: string = DEFAULT_MODEL
): CostEstimate {
  const breakdown: CostEstimate["breakdown"] = [];
  
  // 1. Grouping headlines by topic
  const groupingInputTokens = estimateTokens(
    `System prompt + ${headlineCount} headlines`
  ) + (headlineCount * estimateTokens("A".repeat(averageHeadlineLength)));
  const groupingOutputTokens = estimateTokens(
    JSON.stringify({ groups: Array(Math.ceil(headlineCount / 3)).fill({ topic: "Sample Topic", headlineIndices: [1, 2, 3] }) })
  );
  const groupingCost = calculateCost(groupingInputTokens, groupingOutputTokens, model);
  
  breakdown.push({
    operation: "Topic Grouping",
    tokens: groupingInputTokens + groupingOutputTokens,
    cost: groupingCost,
  });
  
  // 2. Generating hooks and summaries for each group
  const estimatedGroups = Math.ceil(headlineCount / 3);
  const hookSummaryInputTokens = estimatedGroups * (estimateTokens("System prompt") + 500);
  const hookSummaryOutputTokens = estimatedGroups * (estimateTokens("A".repeat(100)) + estimateTokens("A".repeat(300)));
  const hookSummaryCost = calculateCost(hookSummaryInputTokens, hookSummaryOutputTokens, model);
  
  breakdown.push({
    operation: "Hooks & Summaries",
    tokens: hookSummaryInputTokens + hookSummaryOutputTokens,
    cost: hookSummaryCost,
  });
  
  const totalTokens = groupingInputTokens + groupingOutputTokens + hookSummaryInputTokens + hookSummaryOutputTokens;
  const totalCost = groupingCost + hookSummaryCost;
  
  return {
    estimatedTokens: totalTokens,
    estimatedCost: totalCost,
    breakdown,
  };
}

/**
 * Estimate cost for YouTube asset generation
 */
export function estimateYouTubeAssetCost(
  compiledItemCount: number,
  model: string = DEFAULT_MODEL
): CostEstimate {
  const breakdown: CostEstimate["breakdown"] = [];
  
  // For each compiled item, generate title, description, and script
  const inputTokensPerItem = estimateTokens("System prompt + topic + hook + summary") + 800;
  const outputTokensPerItem = 
    estimateTokens("A".repeat(60)) + // Title
    estimateTokens("A".repeat(300)) + // Description
    estimateTokens("A".repeat(500)); // Script outline
  
  const totalInputTokens = inputTokensPerItem * compiledItemCount;
  const totalOutputTokens = outputTokensPerItem * compiledItemCount;
  const totalCost = calculateCost(totalInputTokens, totalOutputTokens, model);
  
  breakdown.push({
    operation: "YouTube Assets",
    tokens: totalInputTokens + totalOutputTokens,
    cost: totalCost,
  });
  
  return {
    estimatedTokens: totalInputTokens + totalOutputTokens,
    estimatedCost: totalCost,
    breakdown,
  };
}

/**
 * Estimate cost for deduplication
 */
export function estimateDeduplicationCost(
  headlineCount: number,
  model: string = DEFAULT_MODEL
): CostEstimate {
  const breakdown: CostEstimate["breakdown"] = [];
  
  // Embedding generation (simplified - actual embedding models are cheaper)
  const embeddingTokens = headlineCount * 100; // Rough estimate
  const embeddingCost = calculateCost(embeddingTokens, 0, model) * 0.1; // Embeddings are much cheaper
  
  breakdown.push({
    operation: "Deduplication",
    tokens: embeddingTokens,
    cost: embeddingCost,
  });
  
  return {
    estimatedTokens: embeddingTokens,
    estimatedCost: embeddingCost,
    breakdown,
  };
}

/**
 * Estimate total cost for a complete run
 */
export function estimateFullRunCost(
  headlineCount: number,
  includeDeduplication: boolean = true,
  model: string = DEFAULT_MODEL
): CostEstimate {
  const breakdown: CostEstimate["breakdown"] = [];
  let totalTokens = 0;
  let totalCost = 0;
  
  // Deduplication (optional)
  if (includeDeduplication) {
    const dedupEstimate = estimateDeduplicationCost(headlineCount, model);
    breakdown.push(...dedupEstimate.breakdown);
    totalTokens += dedupEstimate.estimatedTokens;
    totalCost += dedupEstimate.estimatedCost;
  }
  
  // Compilation
  const compilationEstimate = estimateCompilationCost(headlineCount, 200, model);
  breakdown.push(...compilationEstimate.breakdown);
  totalTokens += compilationEstimate.estimatedTokens;
  totalCost += compilationEstimate.estimatedCost;
  
  // YouTube assets (assume 1/3 of headlines become compiled items)
  const estimatedCompiledItems = Math.ceil(headlineCount / 3);
  const youtubeEstimate = estimateYouTubeAssetCost(estimatedCompiledItems, model);
  breakdown.push(...youtubeEstimate.breakdown);
  totalTokens += youtubeEstimate.estimatedTokens;
  totalCost += youtubeEstimate.estimatedCost;
  
  return {
    estimatedTokens: totalTokens,
    estimatedCost: totalCost,
    breakdown,
  };
}

/**
 * Track actual cost from LLM response
 */
export function trackActualCost(
  inputTokens: number,
  outputTokens: number,
  model: string = DEFAULT_MODEL
): number {
  return calculateCost(inputTokens, outputTokens, model);
}

/**
 * Get available models and their pricing
 */
export function getModelPricing(): Record<string, ModelPricing> {
  return MODEL_PRICING;
}
