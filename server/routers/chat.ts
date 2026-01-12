import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { chatConversations, chatMessages } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import {
  parseQuery,
  buildArchiveContext,
  generateChatResponse,
  createContentFromChat
} from "../services/chatAssistant";
import { nanoid } from "nanoid";

export const chatRouter = router({
  /**
   * Send a message and get AI response
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().optional(),
        message: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available"
        });
      }

      try {
        // Create or get conversation
        let conversationId = input.conversationId;
        if (!conversationId) {
          conversationId = nanoid();
          await db.insert(chatConversations).values({
            id: conversationId,
            userId: ctx.user.id,
            title: input.message.slice(0, 50) + (input.message.length > 50 ? "..." : ""),
          });
        }

        // Save user message
        await db.insert(chatMessages).values({
          conversationId,
          role: "user",
          content: input.message,
        });

        // Parse query
        const parsedQuery = await parseQuery(input.message);

        // Build archive context
        const archiveContext = await buildArchiveContext(
          ctx.user.id,
          parsedQuery
        );

        // Get conversation history
        const history = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.conversationId, conversationId))
          .orderBy(desc(chatMessages.createdAt))
          .limit(10);

        // Generate response
        const { content, metadata } = await generateChatResponse(
          input.message,
          archiveContext,
          history.reverse()
        );

        // Save assistant message
        await db.insert(chatMessages).values({
          conversationId,
          role: "assistant",
          content,
          metadata: JSON.stringify(metadata),
        });

        return {
          conversationId,
          message: content,
          metadata,
        };
      } catch (error) {
        console.error("[Chat] Error processing message:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to process message"
        });
      }
    }),

  /**
   * Create new content from chat
   */
  createContent: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        contentType: z.enum(['compiled_item', 'content_package']),
        data: z.object({
          runId: z.string(),
          topic: z.string().optional(),
          hook: z.string().optional(),
          summary: z.string().optional(),
          heatScore: z.number().optional(),
          sourceHeadlineIds: z.array(z.number()).optional(),
          compiledItemId: z.string().optional(),
          youtubeTitle: z.string().optional(),
          youtubeDescription: z.string().optional(),
          scriptOutline: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available"
        });
      }

      try {
        const result = await createContentFromChat(
          ctx.user.id,
          input.contentType,
          input.data,
          input.conversationId
        );

        return {
          success: true,
          ...result
        };
      } catch (error) {
        console.error("[Chat] Error creating content:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to create content"
        });
      }
    }),

  /**
   * Get conversation history
   */
  getConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available"
        });
      }

      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.conversationId, input.conversationId))
        .orderBy(chatMessages.createdAt);

      return messages;
    }),

  /**
   * List all conversations
   */
  listConversations: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available"
      });
    }

    const conversations = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.userId, ctx.user.id))
      .orderBy(desc(chatConversations.updatedAt));

    return conversations;
  }),

  /**
   * Delete conversation
   */
  deleteConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available"
        });
      }

      // Delete messages first (cascade should handle this, but being explicit)
      await db
        .delete(chatMessages)
        .where(eq(chatMessages.conversationId, input.conversationId));

      // Delete conversation
      await db
        .delete(chatConversations)
        .where(eq(chatConversations.id, input.conversationId));

      return { success: true };
    }),
});
