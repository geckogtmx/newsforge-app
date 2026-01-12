import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { runs, compiledItems, contentPackages, rawHeadlines } from "../../drizzle/schema";
import { eq, and, gte, lte, like, inArray, desc, or } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    referencedRuns?: string[];
    referencedItems?: string[];
    createdAssets?: string[];
    tokens?: number;
  };
}

export interface ParsedQuery {
  intent: 'search' | 'summarize' | 'analyze' | 'generate';
  entities: {
    topics?: string[];
    dateRange?: { start: string; end: string };
    sources?: string[];
    runIds?: string[];
    itemIds?: string[];
  };
}

export interface ArchiveContext {
  runs: any[];
  items: any[];
  packages: any[];
  headlines: any[];
}

/**
 * Parse user query to detect intent and entities using LLM
 */
export async function parseQuery(message: string): Promise<ParsedQuery> {
  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: `You are a query parser. Extract intent and entities from user messages.

Intents:
- search: User wants to find existing content
- summarize: User wants a summary of content
- analyze: User wants insights or trends
- generate: User wants to create NEW content

Entities to extract:
- topics: Array of topic keywords (e.g., ["AI", "regulation"])
- dateRange: { start: ISO date string, end: ISO date string }
- sources: Array of source names
- runIds: Array of run IDs mentioned
- itemIds: Array of item IDs mentioned

Return JSON only, no explanation.

Example input: "Show me all AI stories from last week"
Example output: {"intent":"search","entities":{"topics":["AI"],"dateRange":{"start":"2026-01-04T00:00:00Z","end":"2026-01-11T00:00:00Z"}}}`
      },
      {
        role: 'user',
        content: message
      }
    ],
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content);
}

/**
 * Build archive context from database based on parsed query
 */
export async function buildArchiveContext(
  userId: number,
  parsedQuery: ParsedQuery
): Promise<ArchiveContext> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Query runs
  let runsQuery = db.select().from(runs).where(eq(runs.userId, userId));

  if (parsedQuery.entities.dateRange) {
    const startDate = new Date(parsedQuery.entities.dateRange.start);
    const endDate = new Date(parsedQuery.entities.dateRange.end);
    runsQuery = runsQuery.where(
      and(
        gte(runs.startedAt, startDate),
        lte(runs.startedAt, endDate)
      )
    );
  }

  if (parsedQuery.entities.runIds && parsedQuery.entities.runIds.length > 0) {
    runsQuery = runsQuery.where(inArray(runs.id, parsedQuery.entities.runIds));
  }

  const relevantRuns = await runsQuery.orderBy(desc(runs.startedAt)).limit(10);
  const runIds = relevantRuns.map(r => r.id);

  if (runIds.length === 0) {
    return { runs: [], items: [], packages: [], headlines: [] };
  }

  // Query compiled items
  let itemsQuery = db
    .select()
    .from(compiledItems)
    .where(inArray(compiledItems.runId, runIds));

  if (parsedQuery.entities.topics && parsedQuery.entities.topics.length > 0) {
    const topicFilters = parsedQuery.entities.topics.map(topic =>
      like(compiledItems.topic, `%${topic}%`)
    );
    itemsQuery = itemsQuery.where(or(...topicFilters));
  }

  if (parsedQuery.entities.itemIds && parsedQuery.entities.itemIds.length > 0) {
    itemsQuery = itemsQuery.where(inArray(compiledItems.id, parsedQuery.entities.itemIds));
  }

  const relevantItems = await itemsQuery
    .orderBy(desc(compiledItems.heatScore))
    .limit(20);

  // Get content packages
  const itemIds = relevantItems.map(i => i.id);
  const packages = itemIds.length > 0
    ? await db
        .select()
        .from(contentPackages)
        .where(inArray(contentPackages.compiledItemId, itemIds))
        .limit(10)
    : [];

  // Get source headlines (sample)
  const headlineIds = relevantItems
    .slice(0, 5)
    .flatMap(item => {
      const ids = JSON.parse(String(item.sourceHeadlineIds || "[]"));
      return Array.isArray(ids) ? ids : [];
    });
  
  const headlines = headlineIds.length > 0
    ? await db
        .select()
        .from(rawHeadlines)
        .where(inArray(rawHeadlines.id, headlineIds))
        .limit(20)
    : [];

  return {
    runs: relevantRuns,
    items: relevantItems,
    packages,
    headlines
  };
}

/**
 * Generate chat response using LLM with archive context
 */
export async function generateChatResponse(
  userMessage: string,
  archiveContext: ArchiveContext,
  conversationHistory: ChatMessage[]
): Promise<{ content: string; metadata: any }> {
  const contextString = formatArchiveContext(archiveContext);

  const messages = [
    {
      role: 'system',
      content: `You are NewsForge Assistant, an AI that helps users query and create content from their news research archive.

STRICT RULES:
1. Answer ONLY based on the provided archive data
2. You CANNOT access external websites or documents
3. You CANNOT modify existing runs, items, or packages
4. You CAN suggest creating NEW content based on archive data
5. Always cite run IDs and item IDs when referencing content
6. If data is not in archive, say so clearly
7. Format responses in markdown with clear structure
8. Be concise but informative

Archive Context:
${contextString}`
    },
    ...conversationHistory.slice(-5).map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content: userMessage }
  ];

  const response = await invokeLLM({ messages });

  return {
    content: response.choices[0].message.content,
    metadata: {
      referencedRuns: archiveContext.runs.map(r => r.id),
      referencedItems: archiveContext.items.map(i => i.id),
      tokens: response.usage?.total_tokens || 0
    }
  };
}

/**
 * Format archive context for LLM consumption
 */
function formatArchiveContext(context: ArchiveContext): string {
  let formatted = '';

  formatted += `\n## Runs (${context.runs.length})\n`;
  context.runs.forEach(run => {
    const stats = typeof run.stats === 'string' ? JSON.parse(run.stats) : run.stats;
    formatted += `- **Run ${run.id}**: ${new Date(run.startedAt).toISOString().split('T')[0]}, Status: ${run.status}, Items: ${stats.itemsCompiled || 0}\n`;
  });

  formatted += `\n## Compiled Items (${context.items.length})\n`;
  context.items.slice(0, 10).forEach(item => {
    formatted += `\n### ${item.topic} (Heat Score: ${item.heatScore})\n`;
    formatted += `**Item ID**: ${item.id}\n`;
    formatted += `**Hook**: ${item.hook}\n`;
    formatted += `**Summary**: ${String(item.summary).slice(0, 300)}...\n`;
  });

  if (context.packages.length > 0) {
    formatted += `\n## Content Packages (${context.packages.length})\n`;
    context.packages.slice(0, 5).forEach(pkg => {
      formatted += `- **Package ${pkg.id}**: ${pkg.youtubeTitle || 'Untitled'}\n`;
    });
  }

  if (context.headlines.length > 0) {
    formatted += `\n## Sample Headlines (${context.headlines.length})\n`;
    context.headlines.slice(0, 5).forEach(h => {
      formatted += `- ${h.title} (${h.source})\n`;
    });
  }

  return formatted;
}

/**
 * Create new content based on assistant request
 */
export async function createContentFromChat(
  userId: number,
  contentType: 'compiled_item' | 'content_package',
  data: any,
  conversationId: string
): Promise<{ id: string; type: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (contentType === 'compiled_item') {
    const newId = nanoid();
    await db.insert(compiledItems).values({
      id: newId,
      runId: data.runId,
      topic: data.topic,
      hook: data.hook,
      summary: data.summary,
      heatScore: data.heatScore || 1,
      sourceHeadlineIds: JSON.stringify(data.sourceHeadlineIds || []),
      isSelected: false,
      generatedBy: 'assistant'
    });

    return { id: newId, type: 'compiled_item' };
  }

  if (contentType === 'content_package') {
    const newId = nanoid();
    await db.insert(contentPackages).values({
      id: newId,
      runId: data.runId,
      compiledItemId: data.compiledItemId,
      youtubeTitle: data.youtubeTitle,
      youtubeDescription: data.youtubeDescription,
      scriptOutline: data.scriptOutline,
      status: 'draft',
      isReady: false,
      generatedBy: 'assistant',
      sourceConversationId: conversationId
    });

    return { id: newId, type: 'content_package' };
  }

  throw new Error("Invalid content type");
}
