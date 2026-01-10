import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { runs, rawHeadlines, newsSources } from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { aggregateHeadlines } from "../services/headlineAggregator";
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

      // Use the created run ID

      // Save raw headlines to database
      for (const headline of allHeadlines) {
        await db.insert(rawHeadlines).values({
          runId,
          sourceId: headline.sourceId || "",
          title: headline.title,
          description: headline.description,
          url: headline.url,
          publishedAt: headline.publishedAt,
          source: headline.source as any,
          isSelected: false,
        });
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
});
