import { invokeLLM } from "../_core/llm";
import type { RawHeadline } from "../../drizzle/schema";

export interface HeadlineGroup {
  topic: string;
  headlines: RawHeadline[];
  heatScore: number;
}

export interface CompiledItem {
  topic: string;
  hook: string;
  summary: string;
  sourceHeadlineIds: string[];
  heatScore: number;
}

/**
 * Group headlines by topic using semantic similarity
 * This uses the deduplication engine's grouping logic
 */
export async function groupHeadlinesByTopic(
  headlines: RawHeadline[]
): Promise<HeadlineGroup[]> {
  if (headlines.length === 0) {
    return [];
  }

  // Use LLM to identify topics and group headlines
  const headlineTexts = headlines.map((h, idx) => `${idx + 1}. ${h.title}: ${h.description || ""}`).join("\n");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a news analyst. Group similar headlines by topic. Output JSON with this structure:
{
  "groups": [
    {
      "topic": "Topic name",
      "headlineIndices": [1, 3, 5]
    }
  ]
}

Rules:
- Group headlines that cover the same story or topic
- Each headline should appear in exactly one group
- Topic names should be concise and descriptive
- If a headline is unique, create a single-item group for it`,
      },
      {
        role: "user",
        content: `Group these headlines by topic:\n\n${headlineTexts}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "headline_groups",
        strict: true,
        schema: {
          type: "object",
          properties: {
            groups: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  headlineIndices: {
                    type: "array",
                    items: { type: "integer" },
                  },
                },
                required: ["topic", "headlineIndices"],
                additionalProperties: false,
              },
            },
          },
          required: ["groups"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  const result = JSON.parse(typeof content === 'string' ? content : "{}");
  const groups: HeadlineGroup[] = [];

  for (const group of result.groups || []) {
    const groupHeadlines = group.headlineIndices
      .map((idx: number) => headlines[idx - 1])
      .filter(Boolean);

    if (groupHeadlines.length > 0) {
      groups.push({
        topic: group.topic,
        headlines: groupHeadlines,
        heatScore: groupHeadlines.length,
      });
    }
  }

  return groups;
}

/**
 * Generate a hook (short description) for a compiled item
 */
export async function generateHook(topic: string, headlines: RawHeadline[]): Promise<string> {
  const headlineTexts = headlines
    .map((h) => `- ${h.title}${h.description ? `: ${h.description}` : ""}`)
    .join("\n");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a content writer. Create a compelling hook (1-2 sentences) that summarizes the topic and grabs attention. The hook should be concise, engaging, and informative.`,
      },
      {
        role: "user",
        content: `Topic: ${topic}\n\nHeadlines:\n${headlineTexts}\n\nGenerate a hook:`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  return typeof content === 'string' ? content.trim() : "";
}

/**
 * Generate an extended summary for a compiled item
 */
export async function generateSummary(
  topic: string,
  headlines: RawHeadline[],
  userSettings?: { tone?: string; format?: string }
): Promise<string> {
  const headlineTexts = headlines
    .map((h) => `- ${h.title}${h.description ? `: ${h.description}` : ""}`)
    .join("\n");

  const tone = userSettings?.tone || "professional and informative";
  const format = userSettings?.format || "structured with key points";

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a news researcher. Create a comprehensive summary that:
- Combines information from all provided headlines
- Maintains a ${tone} tone
- Uses a ${format} format
- Highlights key facts, figures, and developments
- Provides context and background when relevant
- Is suitable for YouTube video content`,
      },
      {
        role: "user",
        content: `Topic: ${topic}\n\nHeadlines:\n${headlineTexts}\n\nGenerate a comprehensive summary:`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  return typeof content === 'string' ? content.trim() : "";
}

/**
 * Compile headlines into structured items with hooks and summaries
 */
export async function compileHeadlines(
  headlines: RawHeadline[],
  userSettings?: { tone?: string; format?: string }
): Promise<CompiledItem[]> {
  if (headlines.length === 0) {
    return [];
  }

  // Step 1: Group headlines by topic
  const groups = await groupHeadlinesByTopic(headlines);

  // Step 2: Generate hooks and summaries for each group
  const compiledItems: CompiledItem[] = [];

  for (const group of groups) {
    try {
      const [hook, summary] = await Promise.all([
        generateHook(group.topic, group.headlines),
        generateSummary(group.topic, group.headlines, userSettings),
      ]);

      compiledItems.push({
        topic: group.topic,
        hook,
        summary,
        sourceHeadlineIds: group.headlines.map((h) => String(h.id)),
        heatScore: group.heatScore,
      });
    } catch (error) {
      console.error(`[AI Compilation] Error compiling group "${group.topic}":`, error);
      // Continue with other groups even if one fails
    }
  }

  // Sort by heat score (descending) - most covered stories first
  compiledItems.sort((a, b) => b.heatScore - a.heatScore);

  return compiledItems;
}

/**
 * Regenerate a single compiled item (for user-requested changes)
 */
export async function regenerateCompiledItem(
  topic: string,
  headlines: RawHeadline[],
  userInstructions?: string,
  userSettings?: { tone?: string; format?: string }
): Promise<{ hook: string; summary: string }> {
  const headlineTexts = headlines
    .map((h) => `- ${h.title}${h.description ? `: ${h.description}` : ""}`)
    .join("\n");

  const tone = userSettings?.tone || "professional and informative";
  const format = userSettings?.format || "structured with key points";

  const systemPrompt = userInstructions
    ? `You are a news researcher. The user requested changes: "${userInstructions}". Apply these changes while creating content that maintains a ${tone} tone and uses a ${format} format.`
    : `You are a news researcher. Create content that maintains a ${tone} tone and uses a ${format} format.`;

  const [hookResponse, summaryResponse] = await Promise.all([
    invokeLLM({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Topic: ${topic}\n\nHeadlines:\n${headlineTexts}\n\nGenerate a compelling hook (1-2 sentences):`,
        },
      ],
    }),
    invokeLLM({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Topic: ${topic}\n\nHeadlines:\n${headlineTexts}\n\nGenerate a comprehensive summary suitable for YouTube content:`,
        },
      ],
    }),
  ]);

  const hookContent = hookResponse.choices[0]?.message?.content;
  const summaryContent = summaryResponse.choices[0]?.message?.content;
  
  return {
    hook: typeof hookContent === 'string' ? hookContent.trim() : "",
    summary: typeof summaryContent === 'string' ? summaryContent.trim() : "",
  };
}
