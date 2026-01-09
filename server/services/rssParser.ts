import Parser from "rss-parser";

export interface RSSHeadline {
  title: string;
  description: string;
  url: string;
  publishedAt: Date;
  source: "rss";
}

const parser = new Parser({
  customFields: {
    item: [
      ["content:encoded", "fullContent"],
      ["description", "description"],
    ],
  },
});

export async function parseRSSFeed(feedUrl: string): Promise<RSSHeadline[]> {
  try {
    const feed = await parser.parseURL(feedUrl);
    return (feed.items || [])
      .map((item) => ({
        title: item.title || "Untitled",
        description: item.contentSnippet || item.description || "",
        url: item.link || "",
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        source: "rss" as const,
      }))
      .filter((item) => item.url); // Only include items with URLs
  } catch (error) {
    console.error(`Error parsing RSS feed ${feedUrl}:`, error);
    return [];
  }
}

export async function parseMultipleRSSFeeds(
  feedUrls: string[]
): Promise<RSSHeadline[]> {
  const results = await Promise.all(feedUrls.map((url) => parseRSSFeed(url)));
  return results.flat();
}
