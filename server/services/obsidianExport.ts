import * as fs from "fs/promises";
import * as path from "path";

export interface ContentPackageData {
  id: string;
  topic: string;
  hook: string;
  summary: string;
  youtubeTitle: string;
  youtubeDescription: string;
  scriptOutline: string;
  heatScore: number;
  sources: string[];
  keywords: string[];
  createdAt: Date;
}

export interface ExportOptions {
  vaultPath: string;
  createBacklinks?: boolean;
  useNestedFolders?: boolean;
  addTags?: boolean;
}

export interface ExportResult {
  success: boolean;
  filePath: string;
  error?: string;
}

/**
 * Generate YAML frontmatter for Obsidian note
 */
function generateFrontmatter(pkg: ContentPackageData): string {
  const date = pkg.createdAt.toISOString().split("T")[0];
  const tags = pkg.keywords.map((k) => `"${k}"`).join(", ");

  return `---
title: "${pkg.topic}"
date: ${date}
topic: "${pkg.topic}"
heatScore: ${pkg.heatScore}
sources: [${pkg.sources.map((s) => `"${s}"`).join(", ")}]
tags: [${tags}]
type: news-compilation
---

`;
}

/**
 * Generate Markdown content for Obsidian note
 */
function generateMarkdownContent(pkg: ContentPackageData, createBacklinks: boolean): string {
  let content = "";

  // Title
  content += `# ${pkg.topic}\n\n`;

  // Metadata section
  content += `## Metadata\n\n`;
  content += `- **Heat Score**: ${pkg.heatScore} (covered by ${pkg.sources.length} sources)\n`;
  content += `- **Date**: ${pkg.createdAt.toISOString().split("T")[0]}\n`;
  content += `- **Keywords**: ${pkg.keywords.map((k) => `#${k.replace(/\s+/g, "-")}`).join(", ")}\n\n`;

  // Hook section
  content += `## Hook\n\n`;
  content += `${pkg.hook}\n\n`;

  // Summary section
  content += `## Summary\n\n`;
  content += `${pkg.summary}\n\n`;

  // YouTube Assets section
  content += `---\n\n`;
  content += `## YouTube Assets\n\n`;

  // Title
  content += `### Title\n\n`;
  content += `\`\`\`\n${pkg.youtubeTitle}\n\`\`\`\n\n`;

  // Description
  content += `### Description\n\n`;
  content += `\`\`\`\n${pkg.youtubeDescription}\n\`\`\`\n\n`;

  // Script Outline
  content += `### Script Outline\n\n`;
  content += `\`\`\`\n${pkg.scriptOutline}\n\`\`\`\n\n`;

  // Sources section
  content += `---\n\n`;
  content += `## Sources\n\n`;
  pkg.sources.forEach((source, index) => {
    content += `${index + 1}. ${source}\n`;
  });
  content += `\n`;

  // Backlinks section (if enabled)
  if (createBacklinks) {
    content += `---\n\n`;
    content += `## Related Topics\n\n`;
    pkg.keywords.forEach((keyword) => {
      content += `- [[${keyword}]]\n`;
    });
    content += `\n`;
  }

  return content;
}

/**
 * Generate file path for Obsidian note
 */
function generateFilePath(pkg: ContentPackageData, vaultPath: string, useNestedFolders: boolean): string {
  const date = pkg.createdAt;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  // Sanitize topic for filename
  const sanitizedTopic = pkg.topic
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

  const filename = `${year}-${month}-${day}-${sanitizedTopic}.md`;

  if (useNestedFolders) {
    // Create nested folder structure: vaultPath/NewsForge/YYYY/MM/DD/filename.md
    return path.join(vaultPath, "NewsForge", String(year), month, day, filename);
  } else {
    // Flat structure: vaultPath/NewsForge/filename.md
    return path.join(vaultPath, "NewsForge", filename);
  }
}

/**
 * Export a single content package to Obsidian
 */
export async function exportToObsidian(
  pkg: ContentPackageData,
  options: ExportOptions
): Promise<ExportResult> {
  try {
    // Generate file path
    const filePath = generateFilePath(pkg, options.vaultPath, options.useNestedFolders ?? true);

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Generate content
    const frontmatter = generateFrontmatter(pkg);
    const content = generateMarkdownContent(pkg, options.createBacklinks ?? true);
    const fullContent = frontmatter + content;

    // Write file
    await fs.writeFile(filePath, fullContent, "utf-8");

    return {
      success: true,
      filePath,
    };
  } catch (error) {
    console.error("Error exporting to Obsidian:", error);
    return {
      success: false,
      filePath: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Export multiple content packages to Obsidian in batch
 */
export async function batchExportToObsidian(
  packages: ContentPackageData[],
  options: ExportOptions
): Promise<ExportResult[]> {
  const results: ExportResult[] = [];

  for (const pkg of packages) {
    const result = await exportToObsidian(pkg, options);
    results.push(result);
  }

  return results;
}

/**
 * Create a daily index file linking to all exports for a specific date
 */
export async function createDailyIndex(
  date: Date,
  packages: ContentPackageData[],
  vaultPath: string
): Promise<ExportResult> {
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    const indexPath = path.join(
      vaultPath,
      "NewsForge",
      String(year),
      month,
      day,
      `_index-${year}-${month}-${day}.md`
    );

    // Ensure directory exists
    const dir = path.dirname(indexPath);
    await fs.mkdir(dir, { recursive: true });

    // Generate index content
    let content = `---\ntitle: "News Compilation - ${year}-${month}-${day}"\ndate: ${year}-${month}-${day}\ntype: daily-index\n---\n\n`;
    content += `# News Compilation - ${year}-${month}-${day}\n\n`;
    content += `## Summary\n\n`;
    content += `- **Total Items**: ${packages.length}\n`;
    content += `- **Total Heat Score**: ${packages.reduce((sum, pkg) => sum + pkg.heatScore, 0)}\n\n`;
    content += `## Items\n\n`;

    packages.forEach((pkg, index) => {
      const sanitizedTopic = pkg.topic
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase();
      const filename = `${year}-${month}-${day}-${sanitizedTopic}`;
      content += `${index + 1}. [[${filename}|${pkg.topic}]] (Heat: ${pkg.heatScore})\n`;
    });

    content += `\n`;

    // Write index file
    await fs.writeFile(indexPath, content, "utf-8");

    return {
      success: true,
      filePath: indexPath,
    };
  } catch (error) {
    console.error("Error creating daily index:", error);
    return {
      success: false,
      filePath: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create a knowledge graph file linking related topics
 */
export async function createKnowledgeGraph(
  packages: ContentPackageData[],
  vaultPath: string
): Promise<ExportResult> {
  try {
    const graphPath = path.join(vaultPath, "NewsForge", "_knowledge-graph.md");

    // Ensure directory exists
    const dir = path.dirname(graphPath);
    await fs.mkdir(dir, { recursive: true });

    // Build keyword map
    const keywordMap = new Map<string, ContentPackageData[]>();
    packages.forEach((pkg) => {
      pkg.keywords.forEach((keyword) => {
        if (!keywordMap.has(keyword)) {
          keywordMap.set(keyword, []);
        }
        keywordMap.get(keyword)!.push(pkg);
      });
    });

    // Generate graph content
    let content = `---\ntitle: "NewsForge Knowledge Graph"\ntype: knowledge-graph\n---\n\n`;
    content += `# NewsForge Knowledge Graph\n\n`;
    content += `This page shows connections between topics and keywords across all news compilations.\n\n`;

    // Sort keywords by frequency
    const sortedKeywords = Array.from(keywordMap.entries()).sort((a, b) => b[1].length - a[1].length);

    sortedKeywords.forEach(([keyword, pkgs]) => {
      content += `## ${keyword}\n\n`;
      content += `Appears in ${pkgs.length} ${pkgs.length === 1 ? "item" : "items"}:\n\n`;
      pkgs.forEach((pkg) => {
        const date = pkg.createdAt.toISOString().split("T")[0];
        const sanitizedTopic = pkg.topic
          .replace(/[^a-zA-Z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .toLowerCase();
        const filename = `${date}-${sanitizedTopic}`;
        content += `- [[${filename}|${pkg.topic}]] (${date})\n`;
      });
      content += `\n`;
    });

    // Write graph file
    await fs.writeFile(graphPath, content, "utf-8");

    return {
      success: true,
      filePath: graphPath,
    };
  } catch (error) {
    console.error("Error creating knowledge graph:", error);
    return {
      success: false,
      filePath: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
