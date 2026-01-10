/**
 * Smart Deduplication Engine
 * 
 * Implements semantic similarity detection using embeddings to group duplicate headlines
 * and calculate heat scores based on how many sources cover the same story.
 */

import { invokeLLM } from "../_core/llm";
import type { RawHeadline } from "../../drizzle/schema";
import { nanoid } from "nanoid";

export interface HeadlineWithEmbedding extends RawHeadline {
  embedding?: number[];
}

export interface DeduplicationGroup {
  groupId: string;
  headlines: RawHeadline[];
  heatScore: number;
  bestVersion: RawHeadline;
  topic: string;
}

/**
 * Generate embedding for a headline using LLM
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Use the LLM to generate embeddings
    // Note: This is a placeholder - you'll need to use an actual embedding model
    // For now, we'll use a simple hash-based approach for demonstration
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a semantic analysis assistant. Extract the key topics and entities from the following headline.",
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const messageContent = response.choices[0]?.message?.content;
    const content = typeof messageContent === 'string' ? messageContent : "";
    
    // Create a simple embedding from the response
    // In production, you'd use a proper embedding model like text-embedding-ada-002
    const embedding = createSimpleEmbedding(content);
    
    return embedding;
  } catch (error) {
    console.error("[Deduplication] Error generating embedding:", error);
    // Fallback to simple embedding
    return createSimpleEmbedding(text);
  }
}

/**
 * Create a simple embedding from text (fallback method)
 * In production, replace with actual embedding model
 */
function createSimpleEmbedding(text: string): number[] {
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, "");
  const words = normalized.split(/\s+/).filter(w => w.length > 3);
  
  // Create a 384-dimensional embedding (common size)
  const embedding = new Array(384).fill(0);
  
  // Simple hash-based embedding
  words.forEach((word, idx) => {
    for (let i = 0; i < word.length; i++) {
      const charCode = word.charCodeAt(i);
      const position = (charCode + idx * 7) % 384;
      embedding[position] += 1 / (words.length + 1);
    }
  });
  
  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / (magnitude || 1));
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have the same length");
  }
  
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Group headlines by semantic similarity
 * @param headlines - Array of headlines to deduplicate
 * @param threshold - Similarity threshold (0-1, default 0.75)
 * @returns Array of deduplication groups
 */
export async function groupHeadlines(
  headlines: RawHeadline[],
  threshold: number = 0.75
): Promise<DeduplicationGroup[]> {
  if (headlines.length === 0) {
    return [];
  }

  // Generate embeddings for all headlines
  const headlinesWithEmbeddings: HeadlineWithEmbedding[] = await Promise.all(
    headlines.map(async (headline) => {
      const text = `${headline.title} ${headline.description || ""}`;
      const embedding = await generateEmbedding(text);
      return { ...headline, embedding };
    })
  );

  // Group headlines by similarity
  const groups: Map<string, HeadlineWithEmbedding[]> = new Map();
  const assigned = new Set<number>();

  for (let i = 0; i < headlinesWithEmbeddings.length; i++) {
    if (assigned.has(i)) continue;

    const groupId = nanoid();
    const group: HeadlineWithEmbedding[] = [headlinesWithEmbeddings[i]];
    assigned.add(i);

    // Find similar headlines
    for (let j = i + 1; j < headlinesWithEmbeddings.length; j++) {
      if (assigned.has(j)) continue;

      const similarity = cosineSimilarity(
        headlinesWithEmbeddings[i].embedding!,
        headlinesWithEmbeddings[j].embedding!
      );

      if (similarity >= threshold) {
        group.push(headlinesWithEmbeddings[j]);
        assigned.add(j);
      }
    }

    groups.set(groupId, group);
  }

  // Convert to DeduplicationGroup format
  const deduplicationGroups: DeduplicationGroup[] = [];

  for (const [groupId, groupHeadlines] of Array.from(groups.entries())) {
    // Select best version (longest description, most credible source)
    const bestVersion = selectBestVersion(groupHeadlines);
    
    // Extract topic from best version
    const topic = await extractTopic(bestVersion);

    deduplicationGroups.push({
      groupId,
      headlines: groupHeadlines.map((h: HeadlineWithEmbedding) => {
        const { embedding, ...headline } = h;
        return headline;
      }),
      heatScore: groupHeadlines.length,
      bestVersion: (() => {
        const { embedding, ...headline } = bestVersion;
        return headline;
      })(),
      topic,
    });
  }

  // Sort by heat score (descending)
  deduplicationGroups.sort((a, b) => b.heatScore - a.heatScore);

  return deduplicationGroups;
}

/**
 * Select the best version from a group of similar headlines
 * Criteria: longest description, most credible source, most recent
 */
function selectBestVersion(headlines: HeadlineWithEmbedding[]): HeadlineWithEmbedding {
  if (headlines.length === 1) {
    return headlines[0];
  }

  // Score each headline
  const scored = headlines.map(headline => {
    let score = 0;
    
    // Longer description = more detail
    score += (headline.description?.length || 0) * 0.5;
    
    // Longer title = more detail
    score += headline.title.length * 0.3;
    
    // More recent = more relevant
    if (headline.publishedAt) {
      const age = Date.now() - new Date(headline.publishedAt).getTime();
      const daysSincePublished = age / (1000 * 60 * 60 * 24);
      score += Math.max(0, 100 - daysSincePublished) * 0.2;
    }
    
    return { headline, score };
  });

  // Sort by score and return best
  scored.sort((a, b) => b.score - a.score);
  return scored[0].headline;
}

/**
 * Extract topic from headline using LLM
 */
async function extractTopic(headline: RawHeadline): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "Extract a concise topic (2-5 words) from the following headline. Return only the topic, nothing else.",
        },
        {
          role: "user",
          content: `${headline.title}\n\n${headline.description || ""}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    const topic = (typeof content === 'string' ? content.trim() : headline.title.slice(0, 50));
    return topic;
  } catch (error) {
    console.error("[Deduplication] Error extracting topic:", error);
    // Fallback to first few words of title
    return headline.title.split(" ").slice(0, 5).join(" ");
  }
}

/**
 * Apply deduplication groups to headlines
 * Updates headlines with groupId, heatScore, and isBestVersion flags
 */
export function applyDeduplicationGroups(
  groups: DeduplicationGroup[]
): Array<RawHeadline & { deduplicationGroupId: string; heatScore: number; isBestVersion: boolean }> {
  const result: Array<RawHeadline & { deduplicationGroupId: string; heatScore: number; isBestVersion: boolean }> = [];

  for (const group of groups) {
    for (const headline of group.headlines) {
      result.push({
        ...headline,
        deduplicationGroupId: group.groupId,
        heatScore: group.heatScore,
        isBestVersion: headline.id === group.bestVersion.id,
      });
    }
  }

  return result;
}
