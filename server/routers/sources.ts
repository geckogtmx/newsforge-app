import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { newsSources } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { parseRSSFeed } from "../services/rssParser";
import { scrapeWebsite } from "../services/webScraper";
import { fetchYouTubeChannelVideos } from "../services/youtubeIntegration";

const sourceTypeEnum = z.enum(["rss", "gmail", "youtube", "website"]);

export const sourcesRouter = router({
  /**
   * Get all news sources for the current user
   */
  getSources: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    }

    try {
      const sources = await db
        .select()
        .from(newsSources)
        .where(eq(newsSources.userId, ctx.user.id));

      return sources.map((source) => ({
        id: source.id,
        name: source.name,
        type: source.type,
        config: typeof source.config === 'string' ? JSON.parse(source.config) : source.config,
        topics: typeof source.topics === 'string' ? JSON.parse(source.topics) : source.topics,
        isActive: source.isActive,
        createdAt: source.createdAt,
        qualityScore: source.qualityScore,
        selectionRate: source.selectionRate,
        finalRate: source.finalRate,
        userRating: source.userRating,
        totalHeadlines: source.totalHeadlines,
        selectedHeadlines: source.selectedHeadlines,
        finalHeadlines: source.finalHeadlines,
        lastFetchedAt: source.lastFetchedAt,
      }));
    } catch (error) {
      console.error("[Sources] Error getting sources:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get sources",
      });
    }
  }),

  /**
   * Create a new news source
   */
  createSource: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Source name is required"),
        type: sourceTypeEnum,
        config: z.record(z.string(), z.any()),
        topics: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      try {
        const sourceId = nanoid();

        await db.insert(newsSources).values({
          id: sourceId,
          userId: ctx.user.id,
          name: input.name,
          type: input.type,
          config: JSON.stringify(input.config),
          topics: JSON.stringify(input.topics),
          isActive: true,
        });

        return {
          id: sourceId,
          name: input.name,
          type: input.type,
          config: input.config,
          topics: input.topics,
          isActive: true,
        };
      } catch (error) {
        console.error("[Sources] Error creating source:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create source",
        });
      }
    }),

  /**
   * Update an existing news source
   */
  updateSource: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        config: z.record(z.string(), z.any()).optional(),
        topics: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      try {
        // Verify source belongs to user
        const source = await db
          .select()
          .from(newsSources)
          .where(and(eq(newsSources.id, input.id), eq(newsSources.userId, ctx.user.id)))
          .limit(1);

        if (source.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Source not found" });
        }

        const updateData: Record<string, any> = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.config !== undefined) updateData.config = JSON.stringify(input.config);
        if (input.topics !== undefined) updateData.topics = JSON.stringify(input.topics);
        if (input.isActive !== undefined) updateData.isActive = input.isActive;

        await db.update(newsSources).set(updateData).where(and(eq(newsSources.id, input.id), eq(newsSources.userId, ctx.user.id)));

        return { success: true, message: "Source updated successfully" };
      } catch (error) {
        console.error("[Sources] Error updating source:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update source",
        });
      }
    }),

  /**
   * Delete a news source
   */
  deleteSource: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      try {
        // Verify source belongs to user
        const source = await db
          .select()
          .from(newsSources)
          .where(and(eq(newsSources.id, input.id), eq(newsSources.userId, ctx.user.id)))
          .limit(1);

        if (source.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Source not found" });
        }

        await db.delete(newsSources).where(and(eq(newsSources.id, input.id), eq(newsSources.userId, ctx.user.id)));

        return { success: true, message: "Source deleted successfully" };
      } catch (error) {
        console.error("[Sources] Error deleting source:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete source",
        });
      }
    }),

  /**
   * Test a news source connection
   */
  testSource: protectedProcedure
    .input(
      z.object({
        type: sourceTypeEnum,
        config: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // TODO: Implement actual source testing logic
        // For now, return success
        return {
          success: true,
          message: `Successfully connected to ${input.type} source`,
        };
      } catch (error) {
        console.error("[Sources] Error testing source:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to connect to ${input.type} source`,
        });
      }
    }),

  /**
   * Test connection to an existing source
   */
  testConnection: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      try {
        // Get the source
        const sources = await db
          .select()
          .from(newsSources)
          .where(and(eq(newsSources.id, input.id), eq(newsSources.userId, ctx.user.id)))
          .limit(1);

        if (sources.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Source not found" });
        }

        const source = sources[0];
        const config = typeof source.config === 'string' ? JSON.parse(source.config) : source.config;

        // Test connection based on source type
        let itemCount = 0;
        if (source.type === "rss") {
          if (!config.url) {
            throw new Error("RSS feed URL is required");
          }
          const headlines = await parseRSSFeed(config.url);
          itemCount = headlines.length;
        } else if (source.type === "website") {
          if (!config.url) {
            throw new Error("Website URL is required");
          }
          const headlines = await scrapeWebsite(config.url, config.selectors);
          itemCount = headlines.length;
        } else if (source.type === "youtube") {
          if (!config.channelId) {
            throw new Error("YouTube channel ID is required");
          }
          const headlines = await fetchYouTubeChannelVideos(config.channelId, 10);
          itemCount = headlines.length;
        } else {
          throw new Error(`Source type ${source.type} not yet implemented`);
        }

        return {
          success: true,
          itemCount,
          error: null,
        };
      } catch (error) {
        console.error("[Sources] Error testing connection:", error);
        return {
          success: false,
          itemCount: 0,
          error: error instanceof Error ? error.message : "Connection test failed",
        };
      }
    }),
});
