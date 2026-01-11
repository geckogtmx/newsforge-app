import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { runs, rawHeadlines, compiledItems, userSettings } from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { compileHeadlines, regenerateCompiledItem } from "../services/aiCompilation";
import { estimateCompilationCost } from "../services/costEstimation";
import { nanoid } from "nanoid";

export const compilationRouter = router({
  /**
   * Compile selected headlines into structured items with hooks and summaries
   */
  compileHeadlines: protectedProcedure
    .input(
      z.object({
        runId: z.string(),
        headlineIds: z.array(z.string()).optional(), // If not provided, compile all selected headlines
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      try {
        // Verify run belongs to user
        const runRecords = await db
          .select()
          .from(runs)
          .where(and(eq(runs.id, input.runId), eq(runs.userId, ctx.user.id)))
          .limit(1);

        if (runRecords.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Run not found" });
        }

        // Get headlines to compile
        let headlinesToCompile;
        if (input.headlineIds && input.headlineIds.length > 0) {
          const numericIds = input.headlineIds.map(id => parseInt(id, 10));
          headlinesToCompile = await db
            .select()
            .from(rawHeadlines)
            .where(
              and(
                eq(rawHeadlines.runId, input.runId),
                inArray(rawHeadlines.id, numericIds)
              )
            );
        } else {
          // Compile all selected headlines
          headlinesToCompile = await db
            .select()
            .from(rawHeadlines)
            .where(and(eq(rawHeadlines.runId, input.runId), eq(rawHeadlines.isSelected, true)));
        }

        if (headlinesToCompile.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No headlines selected for compilation",
          });
        }

        // Get user settings for tone and format
        const settingsRecords = await db
          .select()
          .from(userSettings)
          .where(eq(userSettings.userId, ctx.user.id))
          .limit(1);

        const settings = settingsRecords[0];
        const userPreferences = {
          tone: settings?.tone ? String(settings.tone) : undefined,
          format: settings?.format ? String(settings.format) : undefined,
        };

        // Compile headlines using AI
        const compiled = await compileHeadlines(headlinesToCompile, userPreferences);

        // Save compiled items to database
        const savedItems = [];
        for (const item of compiled) {
          const itemId = nanoid();
          await db.insert(compiledItems).values({
            id: itemId,
            runId: input.runId,
            topic: item.topic,
            hook: item.hook,
            summary: item.summary,
            sourceHeadlineIds: JSON.stringify(item.sourceHeadlineIds),
            heatScore: item.heatScore,
            isSelected: false,
          });

          savedItems.push({
            id: itemId,
            ...item,
          });
        }

        // Update run status and stats
        const currentRun = runRecords[0];
        const currentStats =
          typeof currentRun.stats === "string"
            ? JSON.parse(currentRun.stats)
            : currentRun.stats || {};

        await db.update(runs).set({
          status: "compiling",
          stats: JSON.stringify({
            ...currentStats,
            itemsCompiled: compiled.length,
          }),
        }).where(eq(runs.id, input.runId));

        return {
          success: true,
          compiledCount: compiled.length,
          items: savedItems,
        };
      } catch (error) {
        console.error("[Compilation] Error compiling headlines:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to compile headlines",
        });
      }
    }),

  /**
   * Get compiled items for a run
   */
  getCompiledItems: protectedProcedure
    .input(z.object({ runId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      try {
        // Verify run belongs to user
        const runRecords = await db
          .select()
          .from(runs)
          .where(and(eq(runs.id, input.runId), eq(runs.userId, ctx.user.id)))
          .limit(1);

        if (runRecords.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Run not found" });
        }

        const items = await db
          .select()
          .from(compiledItems)
          .where(eq(compiledItems.runId, input.runId));

        return items.map((item) => ({
          id: item.id,
          runId: item.runId,
          topic: item.topic,
          hook: item.hook,
          summary: item.summary,
          sourceHeadlineIds:
            typeof item.sourceHeadlineIds === "string"
              ? JSON.parse(item.sourceHeadlineIds)
              : item.sourceHeadlineIds,
          heatScore: item.heatScore,
          isSelected: item.isSelected,
          createdAt: item.createdAt,
        }));
      } catch (error) {
        console.error("[Compilation] Error getting compiled items:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get compiled items",
        });
      }
    }),

  /**
   * Regenerate a single compiled item with optional user instructions
   */
  regenerateItem: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        instructions: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      try {
        // Get the compiled item
        const items = await db
          .select()
          .from(compiledItems)
          .where(eq(compiledItems.id, input.itemId))
          .limit(1);

        if (items.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Compiled item not found" });
        }

        const item = items[0];

        // Verify run belongs to user
        const runRecords = await db
          .select()
          .from(runs)
          .where(and(eq(runs.id, item.runId), eq(runs.userId, ctx.user.id)))
          .limit(1);

        if (runRecords.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        // Get source headlines
        const sourceIds =
          typeof item.sourceHeadlineIds === "string"
            ? JSON.parse(item.sourceHeadlineIds)
            : item.sourceHeadlineIds;

        const numericSourceIds = sourceIds.map((id: string) => parseInt(id, 10));
        const headlines = await db
          .select()
          .from(rawHeadlines)
          .where(inArray(rawHeadlines.id, numericSourceIds));

        // Get user settings
        const settingsRecords = await db
          .select()
          .from(userSettings)
          .where(eq(userSettings.userId, ctx.user.id))
          .limit(1);

        const settings = settingsRecords[0];
        const userPreferences = {
          tone: settings?.tone ? String(settings.tone) : undefined,
          format: settings?.format ? String(settings.format) : undefined,
        };

        // Regenerate with AI
        const regenerated = await regenerateCompiledItem(
          item.topic,
          headlines,
          input.instructions,
          userPreferences
        );

        // Update the item in database
        await db.update(compiledItems).set({
          hook: regenerated.hook,
          summary: regenerated.summary,
        }).where(eq(compiledItems.id, input.itemId));

        return {
          success: true,
          item: {
            id: item.id,
            topic: item.topic,
            hook: regenerated.hook,
            summary: regenerated.summary,
            sourceHeadlineIds: sourceIds,
            heatScore: item.heatScore,
            isSelected: item.isSelected,
          },
        };
      } catch (error) {
        console.error("[Compilation] Error regenerating item:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to regenerate item",
        });
      }
    }),

  /**
   * Estimate cost before compilation
   */
  estimateCost: protectedProcedure
    .input(
      z.object({
        runId: z.string(),
        headlineIds: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      try {
        // Verify run belongs to user
        const runRecords = await db
          .select()
          .from(runs)
          .where(and(eq(runs.id, input.runId), eq(runs.userId, ctx.user.id)))
          .limit(1);

        if (runRecords.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Run not found" });
        }

        // Get headlines to estimate
        let headlinesToEstimate;
        if (input.headlineIds && input.headlineIds.length > 0) {
          const numericIds = input.headlineIds.map(id => parseInt(id, 10));
          headlinesToEstimate = await db
            .select()
            .from(rawHeadlines)
            .where(
              and(
                eq(rawHeadlines.runId, input.runId),
                inArray(rawHeadlines.id, numericIds)
              )
            );
        } else {
          headlinesToEstimate = await db
            .select()
            .from(rawHeadlines)
            .where(and(eq(rawHeadlines.runId, input.runId), eq(rawHeadlines.isSelected, true)));
        }

        if (headlinesToEstimate.length === 0) {
          return {
            estimatedTokens: 0,
            estimatedCost: 0,
            breakdown: [],
          };
        }

        // Calculate average headline length
        const totalLength = headlinesToEstimate.reduce(
          (sum, h) => sum + h.title.length + (h.description?.length || 0),
          0
        );
        const avgLength = Math.ceil(totalLength / headlinesToEstimate.length);

        // Get user's selected model
        const settingsRecords = await db
          .select()
          .from(userSettings)
          .where(eq(userSettings.userId, ctx.user.id))
          .limit(1);

        const model = settingsRecords[0]?.llmModel
          ? String(settingsRecords[0].llmModel)
          : "gpt-4.1-mini";

        // Estimate cost
        const estimate = estimateCompilationCost(
          headlinesToEstimate.length,
          avgLength,
          model
        );

        return estimate;
      } catch (error) {
        console.error("[Compilation] Error estimating cost:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to estimate cost",
        });
      }
    }),

  /**
   * Update selection status of compiled items
   */
  updateSelection: protectedProcedure
    .input(
      z.object({
        itemIds: z.array(z.string()),
        isSelected: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      try {
        // Verify items belong to user's runs
        const items = await db
          .select()
          .from(compiledItems)
          .where(inArray(compiledItems.id, input.itemIds));

        if (items.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No items found" });
        }

        const runIds = Array.from(new Set(items.map((item) => item.runId)));
        const userRuns = await db
          .select()
          .from(runs)
          .where(and(inArray(runs.id, runIds), eq(runs.userId, ctx.user.id)));

        if (userRuns.length !== runIds.length) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        // Update selection status
        await db.update(compiledItems).set({
          isSelected: input.isSelected,
        }).where(inArray(compiledItems.id, input.itemIds));

        return { success: true, updatedCount: input.itemIds.length };
      } catch (error) {
        console.error("[Compilation] Error updating selection:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update selection",
        });
      }
    }),
});
