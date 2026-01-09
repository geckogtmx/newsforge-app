import axios from "axios";

export interface SearchResult {
  title: string;
  description: string;
  url: string;
  source: "web";
}

/**
 * Perform a Google Custom Search
 * Requires GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID env vars
 */
export async function googleCustomSearch(
  query: string,
  maxResults: number = 10
): Promise<SearchResult[]> {
  try {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !engineId) {
      console.warn("Google Custom Search credentials not configured");
      return [];
    }

    const response = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: {
        key: apiKey,
        cx: engineId,
        q: query,
        num: Math.min(maxResults, 10), // Google API max is 10 per request
      },
    });

    const results: SearchResult[] = [];

    for (const item of response.data.items || []) {
      results.push({
        title: item.title || "Untitled",
        description: item.snippet || "",
        url: item.link || "",
        source: "web",
      });
    }

    return results;
  } catch (error) {
    console.error(`Error performing Google Custom Search for "${query}":`, error);
    return [];
  }
}

/**
 * Perform multiple Google Custom Searches
 */
export async function googleCustomSearchMultiple(
  queries: string[],
  maxResults: number = 10
): Promise<SearchResult[]> {
  const results = await Promise.all(
    queries.map((q) => googleCustomSearch(q, maxResults))
  );
  return results.flat();
}
