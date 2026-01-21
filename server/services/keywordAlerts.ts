/**
 * Keyword Alert Service
 * 
 * Monitors headlines for specific keywords and triggers desktop notifications
 * when matches are found.
 */

import type { KeywordAlert, RawHeadline } from "../../drizzle/schema";
import { keywordAlerts } from "../../drizzle/schema";
import { getDb } from "../db";
import { eq, sql } from "drizzle-orm";

export interface KeywordMatch {
  headlineId: number;
  alertId: string;
  keyword: string;
  matchedIn: "title" | "description" | "both";
  headline: RawHeadline;
}

export interface AlertNotification {
  alertId: string;
  keyword: string;
  matches: KeywordMatch[];
  timestamp: Date;
}

/**
 * Check if a headline matches a keyword
 * Case-insensitive, supports partial matches
 */
export function matchesKeyword(
  headline: RawHeadline,
  keyword: string
): { matches: boolean; matchedIn: "title" | "description" | "both" | null } {
  const normalizedKeyword = keyword.toLowerCase().trim();
  const normalizedTitle = headline.title.toLowerCase();
  const normalizedDescription = (headline.description || "").toLowerCase();

  const titleMatch = normalizedTitle.includes(normalizedKeyword);
  const descriptionMatch = normalizedDescription.includes(normalizedKeyword);

  if (titleMatch && descriptionMatch) {
    return { matches: true, matchedIn: "both" };
  } else if (titleMatch) {
    return { matches: true, matchedIn: "title" };
  } else if (descriptionMatch) {
    return { matches: true, matchedIn: "description" };
  }

  return { matches: false, matchedIn: null };
}

/**
 * Check headlines against all active keyword alerts
 */
export function checkHeadlinesForAlerts(
  headlines: RawHeadline[],
  alerts: KeywordAlert[]
): KeywordMatch[] {
  const matches: KeywordMatch[] = [];

  const activeAlerts = alerts.filter(alert => alert.isActive);

  for (const headline of headlines) {
    for (const alert of activeAlerts) {
      const result = matchesKeyword(headline, alert.keyword);
      
      if (result.matches && result.matchedIn) {
        matches.push({
          headlineId: headline.id,
          alertId: alert.id,
          keyword: alert.keyword,
          matchedIn: result.matchedIn,
          headline,
        });
      }
    }
  }

  return matches;
}

/**
 * Group matches by alert for notification
 */
export function groupMatchesByAlert(matches: KeywordMatch[]): AlertNotification[] {
  const grouped = new Map<string, KeywordMatch[]>();

  for (const match of matches) {
    const existing = grouped.get(match.alertId) || [];
    existing.push(match);
    grouped.set(match.alertId, existing);
  }

  const notifications: AlertNotification[] = [];

  for (const [alertId, alertMatches] of Array.from(grouped.entries())) {
    const keyword = alertMatches[0]?.keyword || "";
    notifications.push({
      alertId,
      keyword,
      matches: alertMatches,
      timestamp: new Date(),
    });
  }

  return notifications;
}

/**
 * Format notification message for desktop notification
 */
export function formatNotificationMessage(notification: AlertNotification): {
  title: string;
  body: string;
  tag: string;
} {
  const count = notification.matches.length;
  const keyword = notification.keyword;

  const title = `NewsForge: "${keyword}" Alert`;
  const body = count === 1
    ? `Found 1 new headline matching "${keyword}"`
    : `Found ${count} new headlines matching "${keyword}"`;

  return {
    title,
    body,
    tag: `alert-${notification.alertId}`,
  };
}

/**
 * Apply matched keywords to headlines
 * Updates the matchedKeywords field with alert IDs
 */
export function applyMatchedKeywords(
  headlines: RawHeadline[],
  matches: KeywordMatch[]
): Array<RawHeadline & { matchedKeywords: string[] }> {
  const matchMap = new Map<number, string[]>();

  for (const match of matches) {
    const existing = matchMap.get(match.headlineId) || [];
    if (!existing.includes(match.alertId)) {
      existing.push(match.alertId);
    }
    matchMap.set(match.headlineId, existing);
  }

  return headlines.map(headline => ({
    ...headline,
    matchedKeywords: matchMap.get(headline.id) || [],
  }));
}

/**
 * Get alert statistics
 */
export function getAlertStatistics(alert: KeywordAlert): {
  matchCount: number;
  avgMatchesPerRun: number;
  lastMatch?: Date;
} {
  return {
    matchCount: alert.matchCount ?? 0,
    avgMatchesPerRun: 0, // TODO: Calculate from run history
    lastMatch: undefined, // TODO: Get from database
  };
}

/**
 * Suggest keywords based on headline content
 * Uses simple frequency analysis
 */
export function suggestKeywords(headlines: RawHeadline[], topN: number = 10): string[] {
  const wordFrequency = new Map<string, number>();

  // Common words to exclude
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
    "be", "have", "has", "had", "do", "does", "did", "will", "would", "should",
    "could", "may", "might", "can", "this", "that", "these", "those", "it",
    "its", "their", "them", "they", "we", "you", "he", "she", "his", "her",
  ]);

  for (const headline of headlines) {
    const text = `${headline.title} ${headline.description || ""}`.toLowerCase();
    const words = text.match(/\b[a-z]{4,}\b/g) || [];

    for (const word of words) {
      if (!stopWords.has(word)) {
        wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
      }
    }
  }

  // Sort by frequency and return top N
  const sorted = Array.from(wordFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);

  return sorted;
}

/**
 * Increment match counts for alerts in the database
 */
export async function incrementAlertMatchCounts(matches: KeywordMatch[]): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Count matches per alert ID
  const counts = new Map<string, number>();
  for (const match of matches) {
    counts.set(match.alertId, (counts.get(match.alertId) || 0) + 1);
  }

  // Update database for each alert
  for (const [alertId, count] of Array.from(counts.entries())) {
    await db
      .update(keywordAlerts)
      .set({
        matchCount: sql`${keywordAlerts.matchCount} + ${count}`,
        updatedAt: new Date(),
      })
      .where(eq(keywordAlerts.id, alertId));
  }
}

/**
 * Validate keyword alert
 */
export function validateKeyword(keyword: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!keyword || keyword.trim().length === 0) {
    errors.push("Keyword cannot be empty");
  }

  if (keyword.length < 2) {
    errors.push("Keyword must be at least 2 characters long");
  }

  if (keyword.length > 100) {
    errors.push("Keyword must be less than 100 characters");
  }

  // Check for special characters that might cause issues
  if (/[<>{}[\]\\]/.test(keyword)) {
    errors.push("Keyword contains invalid characters");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
