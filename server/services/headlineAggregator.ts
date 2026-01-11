import { type NewsSource } from "../../drizzle/schema";
import { parseRSSFeed } from "./rssParser";
import { scrapeWebsite } from "./webScraper";
import { fetchYouTubeChannelVideos } from "./youtubeIntegration";
import { googleCustomSearch } from "./googleSearch";

export interface AggregatedHeadline {
  title: string;
  description: string;
  url: string;
  publishedAt: Date;
  source: "rss" | "gmail" | "youtube" | "website" | "web";
  sourceId?: string;
  sourceType: string;
}

/**
 * Aggregate headlines from all configured sources for a user
 */
export async function aggregateHeadlines(
  sources: NewsSource[]
): Promise<AggregatedHeadline[]> {
  const headlines: AggregatedHeadline[] = [];

  for (const source of sources) {
    if (!source.isActive) continue;

    try {
      let sourceHeadlines: AggregatedHeadline[] = [];

      if (source.type === "rss") {
        const config = typeof source.config === 'string' ? JSON.parse(source.config) : source.config;
        if (config.url) {
          const rssHeadlines = await parseRSSFeed(config.url);
          sourceHeadlines = rssHeadlines.map((h) => ({
            ...h,
            sourceId: source.id,
            sourceType: source.name,
          }));
        }
      } else if (source.type === "website") {
        const config = typeof source.config === 'string' ? JSON.parse(source.config) : source.config;
        if (config.url) {
          const scraped = await scrapeWebsite(config.url, config.selectors);
          sourceHeadlines = scraped.map((h) => ({
            ...h,
            sourceId: source.id,
            sourceType: source.name,
          }));
        }
      } else if (source.type === "youtube") {
        const config = typeof source.config === 'string' ? JSON.parse(source.config) : source.config;
        if (config.channelId) {
          const ytHeadlines = await fetchYouTubeChannelVideos(config.channelId, 10);
          sourceHeadlines = ytHeadlines.map((h) => ({
            ...h,
            sourceId: source.id,
            sourceType: source.name,
          }));
        }
      }
      // Gmail integration requires OAuth tokens, handled separately

      headlines.push(...sourceHeadlines);
    } catch (error) {
      console.error(`Error aggregating headlines from source ${source.name}:`, error);
    }
  }

  return headlines;
}

/**
 * Perform broader web search based on topics
 */
export async function performBroaderSearch(
  topics: string[],
  maxResultsPerTopic: number = 5
): Promise<AggregatedHeadline[]> {
  const headlines: AggregatedHeadline[] = [];

  for (const topic of topics) {
    try {
      const searchResults = await googleCustomSearch(topic, maxResultsPerTopic);
      const aggregated = searchResults.map((r) => ({
        ...r,
        publishedAt: new Date(),
        sourceType: "Web Search",
      }));
      headlines.push(...aggregated);
    } catch (error) {
      console.error(`Error performing broader search for topic "${topic}":`, error);
    }
  }

  return headlines;
}

/**
 * Deduplicate headlines by URL and title similarity
 */
export function deduplicateHeadlines(
  headlines: AggregatedHeadline[]
): AggregatedHeadline[] {
  const seen = new Set<string>();
  const deduplicated: AggregatedHeadline[] = [];

  for (const headline of headlines) {
    // Use URL as primary deduplication key
    const key = headline.url.toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(headline);
    }
  }

  return deduplicated;
}

/**
 * Sort headlines by date (newest first)
 */
export function sortHeadlinesByDate(
  headlines: AggregatedHeadline[]
): AggregatedHeadline[] {
  return [...headlines].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}
