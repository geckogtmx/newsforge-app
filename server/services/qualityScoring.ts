/**
 * Source Quality Scoring Service
 * 
 * Tracks and calculates quality scores for news sources based on:
 * - Selection rate: % of headlines selected for compilation
 * - Final rate: % of headlines that make it to content packages
 * - User rating: Manual thumbs up/down feedback
 */

import type { NewsSource } from "../../drizzle/schema";

export interface QualityMetrics {
  selectionRate: number; // 0-100
  finalRate: number; // 0-100
  userRating: number; // -1, 0, or 1
  qualityScore: number; // 0-100 (calculated)
  totalHeadlines: number;
  selectedHeadlines: number;
  finalHeadlines: number;
}

export interface QualityScoreWeights {
  selectionRate: number; // Default: 0.4
  finalRate: number; // Default: 0.4
  userRating: number; // Default: 0.2
}

const DEFAULT_WEIGHTS: QualityScoreWeights = {
  selectionRate: 0.4,
  finalRate: 0.4,
  userRating: 0.2,
};

/**
 * Calculate quality score from metrics
 * Score is 0-100, where higher is better
 */
export function calculateQualityScore(
  metrics: Omit<QualityMetrics, "qualityScore">,
  weights: QualityScoreWeights = DEFAULT_WEIGHTS
): number {
  // Normalize selection rate (0-100)
  const selectionScore = metrics.selectionRate;

  // Normalize final rate (0-100)
  const finalScore = metrics.finalRate;

  // Normalize user rating (-1, 0, 1) to (0, 50, 100)
  const userScore = (metrics.userRating + 1) * 50;

  // Calculate weighted score
  const score =
    selectionScore * weights.selectionRate +
    finalScore * weights.finalRate +
    userScore * weights.userRating;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Update quality metrics after a run
 */
export function updateQualityMetrics(
  currentMetrics: QualityMetrics,
  newHeadlines: number,
  newSelected: number,
  newFinal: number
): QualityMetrics {
  const totalHeadlines = currentMetrics.totalHeadlines + newHeadlines;
  const selectedHeadlines = currentMetrics.selectedHeadlines + newSelected;
  const finalHeadlines = currentMetrics.finalHeadlines + newFinal;

  const selectionRate = totalHeadlines > 0 ? Math.round((selectedHeadlines / totalHeadlines) * 100) : 0;
  const finalRate = totalHeadlines > 0 ? Math.round((finalHeadlines / totalHeadlines) * 100) : 0;

  const qualityScore = calculateQualityScore({
    selectionRate,
    finalRate,
    userRating: currentMetrics.userRating,
    totalHeadlines,
    selectedHeadlines,
    finalHeadlines,
  });

  return {
    selectionRate,
    finalRate,
    userRating: currentMetrics.userRating,
    qualityScore,
    totalHeadlines,
    selectedHeadlines,
    finalHeadlines,
  };
}

/**
 * Set user rating for a source
 */
export function setUserRating(
  currentMetrics: QualityMetrics,
  rating: -1 | 0 | 1
): QualityMetrics {
  const qualityScore = calculateQualityScore({
    ...currentMetrics,
    userRating: rating,
  });

  return {
    ...currentMetrics,
    userRating: rating,
    qualityScore,
  };
}

/**
 * Get quality tier for a source
 */
export function getQualityTier(score: number): {
  tier: "excellent" | "good" | "average" | "poor";
  label: string;
  color: string;
} {
  if (score >= 80) {
    return { tier: "excellent", label: "Excellent", color: "green" };
  } else if (score >= 60) {
    return { tier: "good", label: "Good", color: "blue" };
  } else if (score >= 40) {
    return { tier: "average", label: "Average", color: "yellow" };
  } else {
    return { tier: "poor", label: "Poor", color: "red" };
  }
}

/**
 * Sort sources by quality and recency
 */
export function sortSourcesByQuality<T extends { qualityScore?: number | null; lastFetchedAt?: Date | string | null }>(
  sources: T[],
  options: {
    qualityWeight?: number; // 0-1, default 0.7
    recencyWeight?: number; // 0-1, default 0.3
  } = {}
): T[] {
  const qualityWeight = options.qualityWeight ?? 0.7;
  const recencyWeight = options.recencyWeight ?? 0.3;

  return sources.slice().sort((a, b) => {
    // Calculate quality score (0-100)
    const qualityA = a.qualityScore ?? 50;
    const qualityB = b.qualityScore ?? 50;

    // Calculate recency score (0-100)
    const now = Date.now();
    const getRecencyScore = (date: Date | string | null | undefined): number => {
      if (!date) return 0;
      const age = now - new Date(date).getTime();
      const daysSince = age / (1000 * 60 * 60 * 24);
      // Score decreases over 30 days
      return Math.max(0, 100 - (daysSince / 30) * 100);
    };

    const recencyA = getRecencyScore(a.lastFetchedAt);
    const recencyB = getRecencyScore(b.lastFetchedAt);

    // Calculate combined score
    const scoreA = qualityA * qualityWeight + recencyA * recencyWeight;
    const scoreB = qualityB * qualityWeight + recencyB * recencyWeight;

    return scoreB - scoreA;
  });
}

/**
 * Get sources that should be auto-hidden (quality < threshold)
 */
export function getAutoHideSources(
  sources: NewsSource[],
  threshold: number = 30
): NewsSource[] {
  return sources.filter(source => {
    const score = source.qualityScore ?? 50;
    return score < threshold && (source.totalHeadlines ?? 0) >= 10; // Only hide if we have enough data
  });
}

/**
 * Get quality insights for a source
 */
export function getQualityInsights(metrics: QualityMetrics): {
  insights: string[];
  recommendations: string[];
} {
  const insights: string[] = [];
  const recommendations: string[] = [];

  // Selection rate insights
  if (metrics.selectionRate < 20 && metrics.totalHeadlines >= 10) {
    insights.push(`Low selection rate (${metrics.selectionRate}%) - most headlines are not relevant`);
    recommendations.push("Consider refining the topics for this source or removing it");
  } else if (metrics.selectionRate > 80) {
    insights.push(`High selection rate (${metrics.selectionRate}%) - very relevant source`);
  }

  // Final rate insights
  if (metrics.finalRate < 10 && metrics.totalHeadlines >= 10) {
    insights.push(`Low final rate (${metrics.finalRate}%) - headlines don't make it to final content`);
    recommendations.push("Review if this source provides unique or valuable information");
  } else if (metrics.finalRate > 50) {
    insights.push(`High final rate (${metrics.finalRate}%) - content frequently makes it to final packages`);
  }

  // User rating insights
  if (metrics.userRating === -1) {
    insights.push("You've rated this source negatively");
    recommendations.push("Consider disabling or removing this source");
  } else if (metrics.userRating === 1) {
    insights.push("You've rated this source positively");
  }

  // Overall quality
  if (metrics.qualityScore >= 80) {
    insights.push("Excellent quality source - keep using it");
  } else if (metrics.qualityScore < 40 && metrics.totalHeadlines >= 10) {
    insights.push("Poor quality source - consider reviewing or removing");
    recommendations.push("Try adjusting topics or replacing with a better source");
  }

  return { insights, recommendations };
}
