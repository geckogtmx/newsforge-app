import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { runs, rawHeadlines, newsSources } from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { aggregateHeadlines } from "../services/headlineAggregator";
import { trackHeadlinesCollected, trackHeadlinesSelected } from "../services/sourceQualityScoring";
import { checkHeadlinesForAlerts, incrementAlertMatchCounts } from "../services/keywordAlerts";
import { keywordAlerts } from "../../drizzle/schema";
import { googleCustomSearch } from "../services/googleSearch";
import { groupHeadlines, applyDeduplicationGroups } from "../services/deduplicationEngine";
import { nanoid } from "nanoid";

export const runsRouter = router({
  /**
   * Start a new run - creates a run record and fetches headlines from configured sources
   */
  startRun: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    }

    try {
      // Create new run
      const runId = nanoid();
      const now = new Date();
      await db.insert(runs).values({
        id: runId,
        userId: ctx.user.id,
        status: "collecting",
        startedAt: now,
        stats: JSON.stringify({
          itemsCollected: 0,
          itemsCompiled: 0,
          contentItems: 0,
          tokensUsed: 0,
        }),
      });

      // Get user's configured sources
      const userSources = await db
        .select()
        .from(newsSources)
        .where(and(eq(newsSources.userId, ctx.user.id), eq(newsSources.isActive, true)));

      if (userSources.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active news sources configured. Please add sources first.",
        });
      }

      // Fetch headlines from all sources
      const allHeadlines = await aggregateHeadlines(userSources);

      // Get active keyword alerts for the user
      const activeAlerts = await db
        .select()
        .from(keywordAlerts)
        .where(and(eq(keywordAlerts.userId, ctx.user.id), eq(keywordAlerts.isActive, true)));

      // Save raw headlines to database and check for alerts
      const sourceHeadlineCounts: Record<string, number> = {};
      const alertMatches: any[] = [];
      
      for (const headline of allHeadlines) {
        // Check for keyword matches
        const matches = checkHeadlinesForAlerts([headline as any], activeAlerts);
        const matchedKeywordIds = matches.map(m => m.alertId);
        
        if (matches.length > 0) {
          alertMatches.push(...matches);
        }

        await db.insert(rawHeadlines).values({
          runId,
          sourceId: headline.sourceId || "",
          title: headline.title,
          description: headline.description,
          url: headline.url,
          publishedAt: headline.publishedAt,
          source: headline.source as any,
          isSelected: false,
          matchedKeywords: matchedKeywordIds.length > 0 ? JSON.stringify(matchedKeywordIds) : null,
        });
        
        // Track headline count per source
        if (headline.sourceId) {
          sourceHeadlineCounts[headline.sourceId] = (sourceHeadlineCounts[headline.sourceId] || 0) + 1;
        }
      }

      // Update alert match counts
      if (alertMatches.length > 0) {
        await incrementAlertMatchCounts(alertMatches);
      }
      
      // Update source quality tracking
      for (const [sourceId, count] of Object.entries(sourceHeadlineCounts)) {
        await trackHeadlinesCollected(sourceId, count);
      }

      // Update run stats
      await db
        .update(runs)
        .set({
          stats: JSON.stringify({
            itemsCollected: allHeadlines.length,
            itemsCompiled: 0,
            contentItems: 0,
            tokensUsed: 0,
          }),
        })
        .where(eq(runs.id, runId));

      return {
        runId,
        itemsCollected: allHeadlines.length,
        message: `Successfully collected ${allHeadlines.length} headlines from ${userSources.length} sources`,
      };
    } catch (error) {
      console.error("[Runs] Error starting run:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to start run",
      });
    }
  }),

  /**
   * Get the current active run
   */
  getCurrentRun: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    }

    try {
      const result = await db
        .select()
        .from(runs)
        .where(and(eq(runs.userId, ctx.user.id), eq(runs.status, "collecting")))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const run = result[0];
      return {
        id: run.id,
        status: run.status,
        startedAt: run.startedAt,
        stats: typeof run.stats === 'string' ? JSON.parse(run.stats) : run.stats,
      };
    } catch (error) {
      console.error("[Runs] Error getting current run:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get current run",
      });
    }
  }),

  /**
   * Get raw headlines for the current run
   */
  getHeadlines: protectedProcedure
    .input(z.object({ runId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      try {
        // Verify run belongs to user
        const run = await db.select().from(runs).where(eq(runs.id, input.runId)).limit(1);

        if (run.length === 0 || run[0].userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Run not found" });
        }

        // Get headlines
        const headlines = await db
          .select()
          .from(rawHeadlines)
          .where(eq(rawHeadlines.runId, input.runId));

        return headlines.map((h) => ({
          id: h.id,
          title: h.title,
          description: h.description,
          url: h.url,
          source: h.source,
          publishedAt: h.publishedAt,
          isSelected: h.isSelected,
          deduplicationGroupId: h.deduplicationGroupId,
          heatScore: h.heatScore,
          isBestVersion: h.isBestVersion,
          matchedKeywords: h.matchedKeywords,
        }));
      } catch (error) {
        console.error("[Runs] Error getting headlines:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get headlines",
        });
      }
    }),

  /**
   * Update headline selection status
   */
  updateHeadlineSelection: protectedProcedure
    .input(
      z.object({
        runId: z.string(),
        headlineIds: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      try {
        // Verify run belongs to user
        const run = await db.select().from(runs).where(eq(runs.id, input.runId)).limit(1);

        if (run.length === 0 || run[0].userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Run not found" });
        }

        // Update all headlines for this run to false first
        await db
          .update(rawHeadlines)
          .set({ isSelected: false })
          .where(eq(rawHeadlines.runId, input.runId));

        // Then set selected headlines to true
        if (input.headlineIds.length > 0) {
          await db
            .update(rawHeadlines)
            .set({ isSelected: true })
            .where(inArray(rawHeadlines.id, input.headlineIds));
        }

        // Track selection for quality scoring
        await trackHeadlinesSelected(input.runId);

        return { success: true, selectedCount: input.headlineIds.length };
      } catch (error) {
        console.error("[Runs] Error updating headline selection:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update headline selection",
        });
      }
    }),

  /**
   * Get run history for archive
   */
  getRunHistory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    }

    try {
      const userRuns = await db
        .select()
        .from(runs)
        .where(eq(runs.userId, ctx.user.id));

      return userRuns.map((run) => ({
        id: run.id,
        status: run.status,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        stats: typeof run.stats === 'string' ? JSON.parse(run.stats) : run.stats,
      }));
    } catch (error) {
      console.error("[Runs] Error getting run history:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get run history",
      });
      }
    }),

  /**
   * Perform broader web search and add results to current run
   */
  broadSearch: protectedProcedure
    .input(
      z.object({
        runId: z.string(),
        query: z.string(),
        maxResults: z.number().optional().default(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      try {
        // Verify run belongs to user
        const run = await db.select().from(runs).where(eq(runs.id, input.runId)).limit(1);

        if (run.length === 0 || run[0].userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Run not found" });
        }

        // Perform web search
        const searchResults = await googleCustomSearch(input.query, input.maxResults);

        if (searchResults.length === 0) {
          return {
            success: true,
            addedCount: 0,
            message: "No search results found. Please try a different query.",
          };
        }

        // Add search results as headlines
        for (const result of searchResults) {
          await db.insert(rawHeadlines).values({
            runId: input.runId,
            sourceId: "web-search",
            title: result.title,
            description: result.description,
            url: result.url,
            publishedAt: new Date(),
            source: "website",
            isSelected: false,
          });
        }

        // Update run stats
        const currentRun = run[0];
        const currentStats =
          typeof currentRun.stats === "string"
            ? JSON.parse(currentRun.stats)
            : currentRun.stats || {};

        await db
          .update(runs)
          .set({
            stats: JSON.stringify({
              ...currentStats,
              itemsCollected: (currentStats.itemsCollected || 0) + searchResults.length,
            }),
          })
          .where(eq(runs.id, input.runId));

        return {
          success: true,
          addedCount: searchResults.length,
          message: `Added ${searchResults.length} headlines from web search`,
        };
      } catch (error) {
        console.error("[Runs] Error performing broad search:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to perform web search",
        });
      }
    }),

  /**
   * Deduplicate headlines for a run
   */
  deduplicateHeadlines: protectedProcedure
    .input(
      z.object({
        runId: z.string(),
        threshold: z.number().optional().default(0.75),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      try {
        // Verify run belongs to user
        const run = await db.select().from(runs).where(eq(runs.id, input.runId)).limit(1);

        if (run.length === 0 || run[0].userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Run not found" });
        }

        // Get all headlines for this run
        const headlines = await db
          .select()
          .from(rawHeadlines)
          .where(eq(rawHeadlines.runId, input.runId));

        if (headlines.length === 0) {
          return {
            success: true,
            groupCount: 0,
            message: "No headlines to deduplicate",
          };
        }

        // Group headlines by similarity
        const groups = await groupHeadlines(headlines, input.threshold);

        // Apply deduplication metadata to headlines
        const deduplicated = applyDeduplicationGroups(groups);

        // Update headlines in database with deduplication metadata
        for (const headline of deduplicated) {
          await db
            .update(rawHeadlines)
            .set({
              deduplicationGroupId: headline.deduplicationGroupId,
              heatScore: headline.heatScore,
              isBestVersion: headline.isBestVersion,
            })
            .where(eq(rawHeadlines.id, headline.id));
        }
        
        // Store deduplication results in run stats
        const currentRun = run[0];
        const currentStats =
          typeof currentRun.stats === "string"
            ? JSON.parse(currentRun.stats)
            : currentRun.stats || {};

        await db
          .update(runs)
          .set({
            stats: JSON.stringify({
              ...currentStats,
              deduplicationGroups: groups.length,
              totalHeadlines: headlines.length,
              uniqueStories: groups.length,
            }),
          })
          .where(eq(runs.id, input.runId));

        return {
          success: true,
          groupCount: groups.length,
          totalHeadlines: headlines.length,
          message: `Found ${groups.length} unique stories from ${headlines.length} headlines`,
          groups: groups.map(g => ({
            groupId: g.groupId,
            topic: g.topic,
            heatScore: g.heatScore,
            headlineCount: g.headlines.length,
            bestVersionId: g.bestVersion.id,
          })),
        };
      } catch (error) {
        console.error("[Runs] Error deduplicating headlines:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to deduplicate headlines",
        });
      }
    }),
});
