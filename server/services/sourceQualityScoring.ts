import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import { newsSources, rawHeadlines, compiledItems, contentPackages } from "../../drizzle/schema";

/**
 * Source Quality Scoring Service
 * Tracks and calculates quality scores for news sources based on:
 * - Selection rate: % of headlines selected for compilation
 * - Final rate: % of headlines that make it to content packages
 * - User rating: Manual thumbs up/down from user
 */

export interface SourceQualityMetrics {
  totalHeadlines: number;
  selectedHeadlines: number;
  finalHeadlines: number;
  selectionRate: number; // 0-100
  finalRate: number; // 0-100
  userRating: number; // -1, 0, or 1
  qualityScore: number; // 0-100 (calculated)
}

/**
 * Calculate quality score based on metrics
 * Formula: (selectionRate * 0.4) + (finalRate * 0.4) + (userRating * 20 + 50) * 0.2
 * 
 * Weights:
 * - Selection rate: 40% - How often headlines are chosen for compilation
 * - Final rate: 40% - How often headlines make it to final packages
 * - User rating: 20% - Manual user feedback (-1 to +1, normalized to 0-100)
 */
export function calculateQualityScore(metrics: SourceQualityMetrics): number {
  const { selectionRate, finalRate, userRating } = metrics;
  
  // Normalize user rating from -1/0/1 to 0-100 scale
  const normalizedUserRating = (userRating + 1) * 50; // -1 -> 0, 0 -> 50, 1 -> 100
  
  // Calculate weighted score
  const score = 
    (selectionRate * 0.4) + 
    (finalRate * 0.4) + 
    (normalizedUserRating * 0.2);
  
  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Update source statistics after a run completes
 * This should be called after:
 * 1. Headlines are collected (updates totalHeadlines)
 * 2. Headlines are selected for compilation (updates selectedHeadlines)
 * 3. Content packages are created (updates finalHeadlines)
 */
export async function updateSourceStatistics(
  sourceId: string,
  updates: {
    totalHeadlines?: number;
    selectedHeadlines?: number;
    finalHeadlines?: number;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[SourceQuality] Database not available");
    return;
  }

  try {
    // Get current source data
    const source = await db
      .select()
      .from(newsSources)
      .where(eq(newsSources.id, sourceId))
      .limit(1);

    if (source.length === 0) {
      console.warn(`[SourceQuality] Source ${sourceId} not found`);
      return;
    }

    const currentSource = source[0];

    // Calculate new totals
    const newTotalHeadlines = updates.totalHeadlines !== undefined
      ? currentSource.totalHeadlines + updates.totalHeadlines
      : currentSource.totalHeadlines;

    const newSelectedHeadlines = updates.selectedHeadlines !== undefined
      ? currentSource.selectedHeadlines + updates.selectedHeadlines
      : currentSource.selectedHeadlines;

    const newFinalHeadlines = updates.finalHeadlines !== undefined
      ? currentSource.finalHeadlines + updates.finalHeadlines
      : currentSource.finalHeadlines;

    // Calculate rates (avoid division by zero)
    const selectionRate = newTotalHeadlines > 0
      ? Math.round((newSelectedHeadlines / newTotalHeadlines) * 100)
      : 0;

    const finalRate = newSelectedHeadlines > 0
      ? Math.round((newFinalHeadlines / newSelectedHeadlines) * 100)
      : 0;

    // Calculate new quality score
    const metrics: SourceQualityMetrics = {
      totalHeadlines: newTotalHeadlines,
      selectedHeadlines: newSelectedHeadlines,
      finalHeadlines: newFinalHeadlines,
      selectionRate,
      finalRate,
      userRating: currentSource.userRating,
      qualityScore: 0, // Will be calculated
    };

    const qualityScore = calculateQualityScore(metrics);

    // Update source
    await db
      .update(newsSources)
      .set({
        totalHeadlines: newTotalHeadlines,
        selectedHeadlines: newSelectedHeadlines,
        finalHeadlines: newFinalHeadlines,
        selectionRate,
        finalRate,
        qualityScore,
        updatedAt: new Date(),
      })
      .where(eq(newsSources.id, sourceId));

    console.log(`[SourceQuality] Updated source ${sourceId}: score=${qualityScore}, selection=${selectionRate}%, final=${finalRate}%`);
  } catch (error) {
    console.error(`[SourceQuality] Error updating source ${sourceId}:`, error);
  }
}

/**
 * Update user rating for a source and recalculate quality score
 */
export async function updateSourceRating(
  sourceId: string,
  rating: -1 | 0 | 1
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[SourceQuality] Database not available");
    return;
  }

  try {
    // Get current source data
    const source = await db
      .select()
      .from(newsSources)
      .where(eq(newsSources.id, sourceId))
      .limit(1);

    if (source.length === 0) {
      console.warn(`[SourceQuality] Source ${sourceId} not found`);
      return;
    }

    const currentSource = source[0];

    // Recalculate quality score with new rating
    const metrics: SourceQualityMetrics = {
      totalHeadlines: currentSource.totalHeadlines,
      selectedHeadlines: currentSource.selectedHeadlines,
      finalHeadlines: currentSource.finalHeadlines,
      selectionRate: currentSource.selectionRate,
      finalRate: currentSource.finalRate,
      userRating: rating,
      qualityScore: 0,
    };

    const qualityScore = calculateQualityScore(metrics);

    // Update source
    await db
      .update(newsSources)
      .set({
        userRating: rating,
        qualityScore,
        updatedAt: new Date(),
      })
      .where(eq(newsSources.id, sourceId));

    console.log(`[SourceQuality] Updated rating for source ${sourceId}: rating=${rating}, score=${qualityScore}`);
  } catch (error) {
    console.error(`[SourceQuality] Error updating rating for source ${sourceId}:`, error);
  }
}

/**
 * Recalculate quality scores for all sources
 * Useful for batch updates or fixing inconsistencies
 */
export async function recalculateAllQualityScores(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn("[SourceQuality] Database not available");
    return 0;
  }

  try {
    // Get all sources for user
    const sources = await db
      .select()
      .from(newsSources)
      .where(eq(newsSources.userId, userId));

    let updatedCount = 0;

    for (const source of sources) {
      // Recalculate rates
      const selectionRate = source.totalHeadlines > 0
        ? Math.round((source.selectedHeadlines / source.totalHeadlines) * 100)
        : 0;

      const finalRate = source.selectedHeadlines > 0
        ? Math.round((source.finalHeadlines / source.selectedHeadlines) * 100)
        : 0;

      // Calculate quality score
      const metrics: SourceQualityMetrics = {
        totalHeadlines: source.totalHeadlines,
        selectedHeadlines: source.selectedHeadlines,
        finalHeadlines: source.finalHeadlines,
        selectionRate,
        finalRate,
        userRating: source.userRating,
        qualityScore: 0,
      };

      const qualityScore = calculateQualityScore(metrics);

      // Update if changed
      if (
        source.selectionRate !== selectionRate ||
        source.finalRate !== finalRate ||
        source.qualityScore !== qualityScore
      ) {
        await db
          .update(newsSources)
          .set({
            selectionRate,
            finalRate,
            qualityScore,
            updatedAt: new Date(),
          })
          .where(eq(newsSources.id, source.id));

        updatedCount++;
      }
    }

    console.log(`[SourceQuality] Recalculated ${updatedCount} source scores for user ${userId}`);
    return updatedCount;
  } catch (error) {
    console.error(`[SourceQuality] Error recalculating scores:`, error);
    return 0;
  }
}

/**
 * Track headlines after collection
 * Call this after headlines are fetched from a source
 */
export async function trackHeadlinesCollected(
  sourceId: string,
  headlineCount: number
): Promise<void> {
  await updateSourceStatistics(sourceId, {
    totalHeadlines: headlineCount,
  });
}

/**
 * Track headlines after selection
 * Call this when user selects headlines for compilation
 */
export async function trackHeadlinesSelected(
  runId: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Get all selected headlines for this run
    const headlines = await db
      .select()
      .from(rawHeadlines)
      .where(
        and(
          eq(rawHeadlines.runId, runId),
          eq(rawHeadlines.isSelected, true)
        )
      );

    // Group by source
    const sourceGroups = headlines.reduce((acc, headline) => {
      const sourceId = headline.sourceId;
      if (!acc[sourceId]) {
        acc[sourceId] = 0;
      }
      acc[sourceId]++;
      return acc;
    }, {} as Record<string, number>);

    // Update each source
    for (const [sourceId, count] of Object.entries(sourceGroups)) {
      await updateSourceStatistics(sourceId, {
        selectedHeadlines: count,
      });
    }

    console.log(`[SourceQuality] Tracked ${headlines.length} selected headlines across ${Object.keys(sourceGroups).length} sources`);
  } catch (error) {
    console.error("[SourceQuality] Error tracking selected headlines:", error);
  }
}

/**
 * Track headlines that made it to final packages
 * Call this after content packages are created
 */
export async function trackHeadlinesFinalized(
  runId: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Get all compiled items for this run
    const items = await db
      .select()
      .from(compiledItems)
      .where(eq(compiledItems.runId, runId));

    // Get all content packages for these items
    const itemIds = items.map(i => i.id);
    if (itemIds.length === 0) return;

    // For each item, extract source headline IDs and track them
    const sourceHeadlineCounts: Record<string, number> = {};

    for (const item of items) {
      // Parse source headline IDs
      const headlineIds = JSON.parse(String(item.sourceHeadlineIds || "[]"));
      
      if (Array.isArray(headlineIds) && headlineIds.length > 0) {
        // Get headlines to find their sources
        const headlines = await db
          .select()
          .from(rawHeadlines)
          .where(eq(rawHeadlines.runId, runId));

        for (const headline of headlines) {
          if (headlineIds.includes(headline.id)) {
            const sourceId = headline.sourceId;
            sourceHeadlineCounts[sourceId] = (sourceHeadlineCounts[sourceId] || 0) + 1;
          }
        }
      }
    }

    // Update each source
    for (const [sourceId, count] of Object.entries(sourceHeadlineCounts)) {
      await updateSourceStatistics(sourceId, {
        finalHeadlines: count,
      });
    }

    console.log(`[SourceQuality] Tracked finalized headlines across ${Object.keys(sourceHeadlineCounts).length} sources`);
  } catch (error) {
    console.error("[SourceQuality] Error tracking finalized headlines:", error);
  }
}

/**
 * Get quality metrics for a source
 */
export async function getSourceQualityMetrics(sourceId: string): Promise<SourceQualityMetrics | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const source = await db
      .select()
      .from(newsSources)
      .where(eq(newsSources.id, sourceId))
      .limit(1);

    if (source.length === 0) return null;

    const s = source[0];
    return {
      totalHeadlines: s.totalHeadlines,
      selectedHeadlines: s.selectedHeadlines,
      finalHeadlines: s.finalHeadlines,
      selectionRate: s.selectionRate,
      finalRate: s.finalRate,
      userRating: s.userRating,
      qualityScore: s.qualityScore,
    };
  } catch (error) {
    console.error(`[SourceQuality] Error getting metrics for source ${sourceId}:`, error);
    return null;
  }
}
