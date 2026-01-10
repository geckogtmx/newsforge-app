/**
 * Incremental Run Service
 * 
 * Implements delta fetching to only fetch new items since the last run,
 * dramatically reducing costs and processing time.
 */

import type { NewsSource } from "../../drizzle/schema";

export interface IncrementalFetchOptions {
  source: NewsSource;
  lastFetchedAt?: Date | null;
  forceFullFetch?: boolean;
}

export interface IncrementalFetchResult {
  isIncremental: boolean;
  itemsFetched: number;
  itemsSkipped: number;
  lastFetchedAt: Date;
  estimatedTokenSavings: number;
}

/**
 * Determine if a source should use incremental fetching
 */
export function shouldUseIncrementalFetch(source: NewsSource, forceFullFetch: boolean = false): boolean {
  if (forceFullFetch) {
    return false;
  }

  // If source has never been fetched, do full fetch
  if (!source.lastFetchedAt) {
    return false;
  }

  // If last fetch was more than 7 days ago, do full fetch
  const daysSinceLastFetch = (Date.now() - new Date(source.lastFetchedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLastFetch > 7) {
    return false;
  }

  return true;
}

/**
 * Filter items by publication date for incremental fetching
 */
export function filterNewItems<T extends { publishedAt?: Date | string | null }>(
  items: T[],
  lastFetchedAt: Date | null
): T[] {
  if (!lastFetchedAt) {
    return items;
  }

  const cutoffTime = new Date(lastFetchedAt).getTime();

  return items.filter(item => {
    if (!item.publishedAt) {
      // If no publish date, include it (better to include than miss)
      return true;
    }

    const publishTime = new Date(item.publishedAt).getTime();
    return publishTime > cutoffTime;
  });
}

/**
 * Calculate estimated token savings from incremental fetch
 * Assumes each headline costs ~50 tokens to process
 */
export function calculateTokenSavings(itemsSkipped: number): number {
  const tokensPerItem = 50;
  return itemsSkipped * tokensPerItem;
}

/**
 * Get fetch time window for incremental fetch
 */
export function getFetchTimeWindow(lastFetchedAt: Date | null): { start: Date; end: Date } {
  const end = new Date();
  
  if (!lastFetchedAt) {
    // If no last fetch, go back 30 days
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start, end };
  }

  // Add a small buffer (1 hour) to avoid missing items at the boundary
  const start = new Date(new Date(lastFetchedAt).getTime() - 60 * 60 * 1000);
  return { start, end };
}

/**
 * Format time window for API queries
 */
export function formatTimeWindow(window: { start: Date; end: Date }): {
  startISO: string;
  endISO: string;
  startUnix: number;
  endUnix: number;
} {
  return {
    startISO: window.start.toISOString(),
    endISO: window.end.toISOString(),
    startUnix: Math.floor(window.start.getTime() / 1000),
    endUnix: Math.floor(window.end.getTime() / 1000),
  };
}

/**
 * Create incremental fetch result summary
 */
export function createIncrementalResult(
  isIncremental: boolean,
  totalItems: number,
  newItems: number
): IncrementalFetchResult {
  const itemsSkipped = totalItems - newItems;
  const estimatedTokenSavings = calculateTokenSavings(itemsSkipped);

  return {
    isIncremental,
    itemsFetched: newItems,
    itemsSkipped,
    lastFetchedAt: new Date(),
    estimatedTokenSavings,
  };
}

/**
 * Get Quick Check mode settings
 * Quick Check is a fast incremental scan (last 24 hours only)
 */
export function getQuickCheckWindow(): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
  return { start, end };
}

/**
 * Validate that incremental fetch is working correctly
 */
export function validateIncrementalFetch(result: IncrementalFetchResult): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Warn if incremental fetch returned 0 items (might be an issue)
  if (result.isIncremental && result.itemsFetched === 0) {
    warnings.push("Incremental fetch returned 0 new items. Source may be inactive or lastFetchedAt may be incorrect.");
  }

  // Warn if incremental fetch returned too many items (might not be working)
  if (result.isIncremental && result.itemsFetched > 1000) {
    warnings.push("Incremental fetch returned unusually high number of items. Verify lastFetchedAt is being updated correctly.");
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}
