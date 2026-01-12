# NewsForge Chat Assistant - Architecture Proposal

**Date**: January 11, 2026  
**Feature**: AI-powered floating chat widget for querying archives and creating new content  
**Status**: Proposal - Ready for Implementation

---

## Overview

The **NewsForge Chat Assistant** is an AI-powered conversational interface accessible from anywhere in the application via a floating widget. The assistant provides natural language interaction with NewsForge archives, enabling users to query historical data and generate new content based on archived research.

### Core Principles

1. **Floating Widget** - Always accessible from bottom-left corner, works on any page
2. **Context-Aware** - Knows current page and can reference active data
3. **Read-Only Archives** - Cannot modify existing runs, items, or packages
4. **Write-Enabled Creation** - Can generate NEW content based on archive data
5. **Isolated Data Access** - Only accesses NewsForge assets, no external sources

### Key Capabilities

**Archive Querying**:
- "Show me all AI regulation stories from last month"
- "What were my top 5 tech topics this week?"
- "How is TechCrunch performing compared to other sources?"

**Content Generation**:
- "Create a new YouTube script combining these 3 topics"
- "Generate a summary article from all AI stories this week"
- "Write a new hook for this topic using a different angle"

**Trend Analysis**:
- "What emerging trends appear in my archive?"
- "Which topics have I covered most frequently?"
- "Show me topic coverage over the last 3 months"

---

## Architecture Design

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                  Frontend (React) - Any Page                 │
├─────────────────────────────────────────────────────────────┤
│  Main Content Area                                           │
│  (Dashboard, Sources, News Inbox, etc.)                      │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Floating Chat Widget (Bottom-Left)                │    │
│  │  ┌──────────────────────────────────────────┐     │    │
│  │  │  [Minimized] Chat Icon                   │     │    │
│  │  │  ↓ Click to expand                       │     │    │
│  │  │  [Expanded] Chat Panel                   │     │    │
│  │  │  - Message history                       │     │    │
│  │  │  - Input box                             │     │    │
│  │  │  - Context indicators                    │     │    │
│  │  │  - Action buttons (save, export)         │     │    │
│  │  └──────────────────────────────────────────┘     │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    tRPC API Layer                            │
├─────────────────────────────────────────────────────────────┤
│  chat.sendMessage()         - Process user query             │
│  chat.getConversation()     - Retrieve message history       │
│  chat.listConversations()   - List all conversations         │
│  chat.deleteConversation()  - Delete conversation            │
│  chat.createContent()       - Generate new assets            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               Chat Assistant Service                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────────────────┐    │
│  │  Query Parser    │  │  Archive Context Builder     │    │
│  │  - Intent detect │  │  - Retrieve relevant data    │    │
│  │  - Entity extract│  │  - Build LLM context         │    │
│  │  - Action routing│  │  - Filter by constraints     │    │
│  └──────────────────┘  └──────────────────────────────┘    │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────────────────┐    │
│  │  LLM Orchestrator│  │  Content Generator           │    │
│  │  - Model routing │  │  - Create compiled items     │    │
│  │  - Prompt mgmt   │  │  - Create content packages   │    │
│  │  - Response gen  │  │  - Save to database          │    │
│  └──────────────────┘  └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Archive Access Layer (READ-ONLY)            │
├─────────────────────────────────────────────────────────────┤
│  - Query runs, compiledItems, contentPackages               │
│  - Filter by date, topic, source, heat score                │
│  - Full-text search on summaries and scripts                │
│  - Aggregate statistics and trends                           │
│  - NO MODIFICATION of existing data                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Content Creation Layer (WRITE-ENABLED)          │
├─────────────────────────────────────────────────────────────┤
│  - Create NEW compiledItems                                  │
│  - Create NEW contentPackages                                │
│  - Generate NEW YouTube assets                               │
│  - Mark as "assistant-generated"                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database (MySQL)                        │
│  READ: runs, compiledItems, contentPackages, runArchives    │
│  WRITE: NEW compiledItems, NEW contentPackages              │
└─────────────────────────────────────────────────────────────┘
```

---

## UI Design: Floating Widget

### Minimized State

```
┌─────────────────────────────────────────┐
│ NewsForge App                           │
│ ┌─────────┐                             │
│ │ Sidebar │  Main Content               │
│ │         │                             │
│ │ Home    │                             │
│ │ Sources │                             │
│ │ Run     │                             │
│ │         │                             │
│ │         │                             │
│ │         │                             │
│ │         │                             │
│ │ ┌─────┐ │                             │
│ │ │ 💬  │ │  ← Floating chat icon       │
│ │ └─────┘ │     (bottom-left)           │
│ └─────────┘                             │
└─────────────────────────────────────────┘
```

### Expanded State

```
┌─────────────────────────────────────────┐
│ NewsForge App                           │
│ ┌─────────┐                             │
│ │ Sidebar │  Main Content               │
│ │         │                             │
│ │ Home    │                             │
│ │ Sources │                             │
│ │ Run     │  ┌──────────────────────┐   │
│ │         │  │ Chat Assistant       │   │
│ │         │  │ ──────────────────── │   │
│ │         │  │ User: Show me AI...  │   │
│ │         │  │ Bot: Here are 5...   │   │
│ │         │  │                      │   │
│ │         │  │ [Input box]          │   │
│ │ ┌─────┐ │  └──────────────────────┘   │
│ │ │ ✕   │ │  ← Click to minimize        │
│ │ └─────┘ │                             │
│ └─────────┘                             │
└─────────────────────────────────────────┘
```

### Component Specifications

**Minimized Icon**:
- Size: 56x56px
- Position: Fixed, bottom-left (16px from edges)
- Icon: Chat bubble or sparkles
- Color: Blue accent (matches primary buttons)
- Hover: Slight scale animation
- Badge: Show unread message count (if applicable)

**Expanded Panel**:
- Size: 400px wide × 600px tall
- Position: Fixed, bottom-left (80px from bottom, 16px from left)
- Background: Dark theme (matches app)
- Border: Subtle border with shadow
- Animation: Slide up and fade in
- Z-index: 1000 (above all content)

---

## Data Flow Examples

### Example 1: Query Archive

**User**: "What were my top AI stories last week?"

1. **Frontend** → Sends message via `chat.sendMessage()`
2. **Query Parser** → Detects intent: "search", entities: ["AI", "last week"]
3. **Archive Context Builder** → Queries database:
   - Filter runs by date (last 7 days)
   - Filter compiledItems by topic containing "AI"
   - Sort by heatScore (descending)
   - Retrieve top 5 items with source headlines
4. **LLM Orchestrator** → Builds prompt with archive context
5. **Response** → Natural language summary with citations
6. **Frontend** → Displays response with clickable run/item links

### Example 2: Generate New Content

**User**: "Create a YouTube script combining topics X, Y, Z from last month"

1. **Frontend** → Sends message via `chat.sendMessage()`
2. **Query Parser** → Detects intent: "generate", entities: ["topics X, Y, Z", "last month"]
3. **Archive Context Builder** → Retrieves relevant items
4. **Content Generator** → Creates NEW contentPackage:
   - Generates YouTube title
   - Generates description
   - Generates script outline
   - Marks as `generatedBy: "assistant"`
   - Saves to database
5. **Response** → "Created new content package: [link]"
6. **Frontend** → Shows success message with link to new package

---

## Database Schema Extensions

### New Table: `chatConversations`

```sql
CREATE TABLE chatConversations (
  id VARCHAR(64) PRIMARY KEY,
  userId INT NOT NULL,
  title VARCHAR(255),
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

### New Table: `chatMessages`

```sql
CREATE TABLE chatMessages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversationId VARCHAR(64) NOT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content TEXT NOT NULL,
  metadata JSON,
  createdAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (conversationId) REFERENCES chatConversations(id) ON DELETE CASCADE
);
```

**Metadata JSON Structure**:
```json
{
  "referencedRuns": ["run_123", "run_456"],
  "referencedItems": [1, 2, 3],
  "createdAssets": ["pkg_789"],
  "tokens": 3500,
  "model": "gemini-2.5-flash"
}
```

### Extension to Existing Tables

**compiledItems**:
- Add column: `generatedBy VARCHAR(50)` - Values: `null`, `"assistant"`

**contentPackages**:
- Add column: `generatedBy VARCHAR(50)` - Values: `null`, `"assistant"`
- Add column: `sourceConversationId VARCHAR(64)` - Links to chat conversation

---

## Backend Implementation

### Service: `server/services/chatAssistant.ts`

```typescript
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { runs, compiledItems, contentPackages, rawHeadlines } from "../../drizzle/schema";
import { eq, and, gte, lte, like, inArray, desc, or } from "drizzle-orm";

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    referencedRuns?: string[];
    referencedItems?: number[];
    createdAssets?: string[];
    tokens?: number;
  };
}

export interface ParsedQuery {
  intent: 'search' | 'summarize' | 'analyze' | 'generate';
  entities: {
    topics?: string[];
    dateRange?: { start: Date; end: Date };
    sources?: string[];
    runIds?: string[];
    itemIds?: number[];
  };
}

export interface ArchiveContext {
  runs: any[];
  items: any[];
  packages: any[];
  headlines: any[];
}

/**
 * Parse user query to detect intent and entities using LLM
 */
export async function parseQuery(message: string): Promise<ParsedQuery> {
  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: `You are a query parser. Extract intent and entities from user messages.

Intents:
- search: User wants to find existing content
- summarize: User wants a summary of content
- analyze: User wants insights or trends
- generate: User wants to create NEW content

Entities to extract:
- topics: Array of topic keywords
- dateRange: { start: ISO date, end: ISO date }
- sources: Array of source names
- runIds: Array of run IDs mentioned
- itemIds: Array of item IDs mentioned

Return JSON only, no explanation.`
      },
      {
        role: 'user',
        content: message
      }
    ],
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content);
}

/**
 * Build archive context from database based on parsed query
 */
export async function buildArchiveContext(
  userId: number,
  parsedQuery: ParsedQuery
): Promise<ArchiveContext> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Query runs
  let runsQuery = db.select().from(runs).where(eq(runs.userId, userId));

  if (parsedQuery.entities.dateRange) {
    runsQuery = runsQuery.where(
      and(
        gte(runs.startedAt, parsedQuery.entities.dateRange.start),
        lte(runs.startedAt, parsedQuery.entities.dateRange.end)
      )
    );
  }

  if (parsedQuery.entities.runIds && parsedQuery.entities.runIds.length > 0) {
    runsQuery = runsQuery.where(inArray(runs.id, parsedQuery.entities.runIds));
  }

  const relevantRuns = await runsQuery;
  const runIds = relevantRuns.map(r => r.id);

  if (runIds.length === 0) {
    return { runs: [], items: [], packages: [], headlines: [] };
  }

  // Query compiled items
  let itemsQuery = db
    .select()
    .from(compiledItems)
    .where(inArray(compiledItems.runId, runIds));

  if (parsedQuery.entities.topics && parsedQuery.entities.topics.length > 0) {
    const topicFilters = parsedQuery.entities.topics.map(topic =>
      like(compiledItems.topic, `%${topic}%`)
    );
    itemsQuery = itemsQuery.where(or(...topicFilters));
  }

  if (parsedQuery.entities.itemIds && parsedQuery.entities.itemIds.length > 0) {
    itemsQuery = itemsQuery.where(inArray(compiledItems.id, parsedQuery.entities.itemIds));
  }

  const relevantItems = await itemsQuery
    .orderBy(desc(compiledItems.heatScore))
    .limit(20);

  // Get content packages
  const itemIds = relevantItems.map(i => i.id);
  const packages = itemIds.length > 0
    ? await db
        .select()
        .from(contentPackages)
        .where(inArray(contentPackages.compiledItemId, itemIds))
    : [];

  // Get source headlines
  const headlineIds = relevantItems.flatMap(item =>
    JSON.parse(String(item.sourceHeadlineIds || "[]"))
  );
  const headlines = headlineIds.length > 0
    ? await db
        .select()
        .from(rawHeadlines)
        .where(inArray(rawHeadlines.id, headlineIds))
    : [];

  return {
    runs: relevantRuns,
    items: relevantItems,
    packages,
    headlines
  };
}

/**
 * Generate chat response using LLM with archive context
 */
export async function generateChatResponse(
  userMessage: string,
  archiveContext: ArchiveContext,
  conversationHistory: ChatMessage[]
): Promise<{ content: string; metadata: any }> {
  const contextString = formatArchiveContext(archiveContext);

  const messages = [
    {
      role: 'system',
      content: `You are NewsForge Assistant, an AI that helps users query and create content from their news research archive.

STRICT RULES:
1. Answer ONLY based on the provided archive data
2. You CANNOT access external websites or documents
3. You CANNOT modify existing runs, items, or packages
4. You CAN suggest creating NEW content based on archive data
5. Always cite run IDs and item IDs when referencing content
6. If data is not in archive, say so clearly
7. Format responses in markdown

Archive Context:
${contextString}`
    },
    ...conversationHistory.slice(-5),
    { role: 'user', content: userMessage }
  ];

  const response = await invokeLLM({ messages });

  return {
    content: response.choices[0].message.content,
    metadata: {
      referencedRuns: archiveContext.runs.map(r => r.id),
      referencedItems: archiveContext.items.map(i => i.id),
      tokens: response.usage?.total_tokens || 0
    }
  };
}

/**
 * Format archive context for LLM consumption
 */
function formatArchiveContext(context: ArchiveContext): string {
  let formatted = '';

  formatted += `\n## Runs (${context.runs.length})\n`;
  context.runs.forEach(run => {
    formatted += `- Run ${run.id}: ${new Date(run.startedAt).toISOString()}, Status: ${run.status}\n`;
  });

  formatted += `\n## Compiled Items (${context.items.length})\n`;
  context.items.slice(0, 10).forEach(item => {
    formatted += `\n### ${item.topic} (Heat Score: ${item.heatScore})\n`;
    formatted += `**Item ID**: ${item.id}\n`;
    formatted += `**Hook**: ${item.hook}\n`;
    formatted += `**Summary**: ${String(item.summary).slice(0, 300)}...\n`;
  });

  if (context.packages.length > 0) {
    formatted += `\n## Content Packages (${context.packages.length})\n`;
    context.packages.slice(0, 5).forEach(pkg => {
      formatted += `- Package ${pkg.id}: ${pkg.youtubeTitle || 'Untitled'}\n`;
    });
  }

  return formatted;
}

/**
 * Create new content based on assistant request
 */
export async function createContentFromChat(
  userId: number,
  contentType: 'compiled_item' | 'content_package',
  data: any,
  conversationId: string
): Promise<{ id: string | number; type: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (contentType === 'compiled_item') {
    const [newItem] = await db.insert(compiledItems).values({
      runId: data.runId,
      topic: data.topic,
      hook: data.hook,
      summary: data.summary,
      heatScore: data.heatScore || 1,
      sourceHeadlineIds: JSON.stringify(data.sourceHeadlineIds || []),
      generatedBy: 'assistant'
    }).returning();

    return { id: newItem.id, type: 'compiled_item' };
  }

  if (contentType === 'content_package') {
    const [newPackage] = await db.insert(contentPackages).values({
      runId: data.runId,
      compiledItemId: data.compiledItemId,
      youtubeTitle: data.youtubeTitle,
      youtubeDescription: data.youtubeDescription,
      scriptOutline: data.scriptOutline,
      generatedBy: 'assistant',
      sourceConversationId: conversationId,
      isReady: false
    }).returning();

    return { id: newPackage.id, type: 'content_package' };
  }

  throw new Error("Invalid content type");
}
```

---

## tRPC Router: `server/routers/chat.ts`

```typescript
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
            title: input.message.slice(0, 50) + "...",
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
        data: z.any(),
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

      await db
        .delete(chatMessages)
        .where(eq(chatMessages.conversationId, input.conversationId));

      await db
        .delete(chatConversations)
        .where(eq(chatConversations.id, input.conversationId));

      return { success: true };
    }),
});
```

---

## Frontend Implementation

### Component: `client/src/components/ChatWidget.tsx`

```typescript
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  metadata?: any;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.message, metadata: data.metadata }
      ]);
      setIsLoading(false);
    },
    onError: (error) => {
      toast.error(`Failed to send message: ${error.message}`);
      setIsLoading(false);
    },
  });

  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsLoading(true);

    sendMessage.mutate({
      conversationId: conversationId || undefined,
      message: userMessage,
    });
  };

  useEffect(() => {
    if (isOpen) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 left-4 h-14 w-14 rounded-full shadow-lg z-50"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <Card className="fixed bottom-20 left-4 w-[400px] h-[600px] shadow-xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">NewsForge Assistant</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Ask me anything about your NewsForge archive
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-3 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask about your archive..."
                disabled={isLoading}
                className="text-sm"
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
```

### Integration: Add to `client/src/App.tsx`

```typescript
import { ChatWidget } from "@/components/ChatWidget";

function App() {
  return (
    <div className="app">
      {/* Existing app content */}
      <Router>
        {/* Routes */}
      </Router>
      
      {/* Chat Widget - Always available */}
      <ChatWidget />
    </div>
  );
}
```

---

## Implementation Phases

### Phase 1: Database & Backend (2-3 days)
- [ ] Create database migration for `chatConversations` and `chatMessages`
- [ ] Add `generatedBy` and `sourceConversationId` columns to existing tables
- [ ] Implement `chatAssistant.ts` service (query parsing, context building)
- [ ] Implement `chat.ts` tRPC router
- [ ] Test backend with Postman/curl

### Phase 2: Floating Widget UI (1-2 days)
- [ ] Create `ChatWidget.tsx` component
- [ ] Implement minimized/expanded states
- [ ] Add animations and transitions
- [ ] Integrate with tRPC mutations
- [ ] Test on different pages

### Phase 3: Content Generation (2-3 days)
- [ ] Implement `createContentFromChat()` function
- [ ] Add content creation tRPC procedure
- [ ] Test creating compiled items from chat
- [ ] Test creating content packages from chat
- [ ] Add UI for viewing created assets

### Phase 4: Polish & Testing (1-2 days)
- [ ] Add conversation history management
- [ ] Implement error handling and loading states
- [ ] Add cost tracking for chat usage
- [ ] Mobile responsive design
- [ ] End-to-end testing

**Total Estimated Time**: 6-10 days

---

## Cost Considerations

### Token Usage Per Query

- System prompt: ~500 tokens
- Archive context: ~2,000 tokens (10 items × 200 tokens)
- Conversation history: ~500 tokens
- User query: ~50 tokens
- Response: ~300 tokens

**Total**: ~3,350 tokens per query

### Monthly Cost Estimate

Assuming 100 queries/month:
- Using `gemini-2.5-flash`: ~$0.10/month
- Using `gpt-4.1-mini`: ~$0.50/month

### Optimization Strategies

- Limit archive context to top 10 most relevant items
- Truncate long summaries in context
- Cache common queries
- Use cheaper models for simple searches

---

## Security & Data Isolation

### Access Control
- Users can only query their own archives
- All queries filtered by `userId`
- Conversation history is user-specific

### Data Constraints
- **READ-ONLY** on existing runs, items, packages
- **WRITE-ENABLED** only for NEW content creation
- No external data sources accessed
- No modification of archived data

### LLM Safety
- System prompt enforces archive-only rule
- Citations required for all claims
- Clear error messages when data not found

---

## Summary

The **NewsForge Chat Assistant** is a floating widget that provides AI-powered querying and content generation capabilities. It integrates seamlessly with the existing UI, respects data constraints (read-only archives, write-enabled for new content), and leverages the current LLM infrastructure.

**Key Features**:
- ✅ Floating widget (bottom-left corner)
- ✅ Context-aware but unrestricted queries
- ✅ Read-only access to existing assets
- ✅ Write capability for NEW content only
- ✅ No external data access
- ✅ Model-agnostic (works with any LLM)

**Implementation Effort**: 6-10 days  
**MVP Effort**: 3-4 days (basic chat + archive querying)

---

**Status**: Ready for implementation approval
