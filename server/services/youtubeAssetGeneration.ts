import { invokeLLM } from "../_core/llm";

export interface CompiledItemInput {
  topic: string;
  hook: string;
  summary: string;
}

export interface YouTubeAssets {
  title: string;
  description: string;
  scriptOutline: string;
}

export interface UserPreferences {
  tone?: string;
  format?: string;
}

/**
 * Generate YouTube assets (title, description, script outline) from a compiled item
 */
export async function generateYouTubeAssets(
  item: CompiledItemInput,
  preferences?: UserPreferences
): Promise<YouTubeAssets> {
  const systemPrompt = `You are a YouTube content strategist specializing in creating engaging, SEO-optimized video assets.

Your task is to generate three assets for a YouTube video based on the provided news compilation:
1. **Title**: Catchy, SEO-optimized, under 100 characters, includes key keywords
2. **Description**: Detailed, informative, includes timestamps placeholders, relevant links, and call-to-action
3. **Script Outline**: Structured outline with intro hook, main points (3-5), and outro with CTA

${preferences?.tone ? `Tone: ${preferences.tone}` : "Tone: Professional yet engaging"}
${preferences?.format ? `Format: ${preferences.format}` : ""}

Return your response as a JSON object with three keys: "title", "description", and "scriptOutline".`;

  const userPrompt = `Generate YouTube assets for this news item:

**Topic**: ${item.topic}
**Hook**: ${item.hook}
**Summary**: ${item.summary}

Create engaging, click-worthy assets that will perform well on YouTube while maintaining accuracy and professionalism.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "youtube_assets",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "YouTube video title (under 100 characters)",
              },
              description: {
                type: "string",
                description: "YouTube video description with timestamps and links",
              },
              scriptOutline: {
                type: "string",
                description: "Script outline with intro, main points, and outro",
              },
            },
            required: ["title", "description", "scriptOutline"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("Invalid response from LLM");
    }

    const assets = JSON.parse(content) as YouTubeAssets;

    // Validate title length
    if (assets.title.length > 100) {
      assets.title = assets.title.substring(0, 97) + "...";
    }

    return assets;
  } catch (error) {
    console.error("Error generating YouTube assets:", error);
    throw new Error(`Failed to generate YouTube assets: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Regenerate a specific YouTube asset with custom instructions
 */
export async function regenerateYouTubeAsset(
  assetType: "title" | "description" | "scriptOutline",
  currentAsset: string,
  item: CompiledItemInput,
  instructions?: string,
  preferences?: UserPreferences
): Promise<string> {
  const assetLabels = {
    title: "Title",
    description: "Description",
    scriptOutline: "Script Outline",
  };

  const systemPrompt = `You are a YouTube content strategist. Your task is to regenerate the ${assetLabels[assetType]} for a YouTube video based on user feedback.

${preferences?.tone ? `Tone: ${preferences.tone}` : "Tone: Professional yet engaging"}
${preferences?.format ? `Format: ${preferences.format}` : ""}

${assetType === "title" ? "The title must be under 100 characters, catchy, and SEO-optimized." : ""}
${assetType === "description" ? "The description should be detailed, include timestamp placeholders, and have a call-to-action." : ""}
${assetType === "scriptOutline" ? "The script outline should have a clear structure: intro hook, 3-5 main points, and outro with CTA." : ""}

Return only the regenerated ${assetLabels[assetType]} as plain text, without any additional formatting or explanation.`;

  const userPrompt = `Current ${assetLabels[assetType]}:
${currentAsset}

News Item Context:
**Topic**: ${item.topic}
**Hook**: ${item.hook}
**Summary**: ${item.summary}

${instructions ? `User Instructions: ${instructions}` : "Improve and refine this asset."}

Generate an improved version of the ${assetLabels[assetType]}.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("Invalid response from LLM");
    }

    let regenerated = content.trim();

    // Validate title length
    if (assetType === "title" && regenerated.length > 100) {
      regenerated = regenerated.substring(0, 97) + "...";
    }

    return regenerated;
  } catch (error) {
    console.error(`Error regenerating ${assetType}:`, error);
    throw new Error(`Failed to regenerate ${assetType}: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Generate YouTube assets for multiple compiled items in batch
 */
export async function generateBatchYouTubeAssets(
  items: CompiledItemInput[],
  preferences?: UserPreferences
): Promise<YouTubeAssets[]> {
  const results: YouTubeAssets[] = [];

  for (const item of items) {
    try {
      const assets = await generateYouTubeAssets(item, preferences);
      results.push(assets);
    } catch (error) {
      console.error(`Error generating assets for item "${item.topic}":`, error);
      // Return placeholder assets on error
      results.push({
        title: `${item.topic} - [Generation Failed]`,
        description: `Failed to generate description. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        scriptOutline: `Failed to generate script outline. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  return results;
}
