# NewsForge Architecture & Design

## System Overview

NewsForge is a web application that automates the workflow of researching, compiling, and preparing news content for YouTube video production. The system integrates multiple news sources (RSS, Gmail, YouTube, websites) and uses AI to transform raw headlines into structured, YouTube-ready content packages.

## Workflow Stages

1. **Home Dashboard** - Display last run statistics and quick access to start new runs
2. **Sources Management** - Configure trusted news sources and topics
3. **News Inbox** - Collect and review raw headlines from all sources
4. **Broader Web Search** - Supplement results with additional web searches
5. **Research & Compilation** - AI processes headlines into homologated summaries
6. **Content Package** - Select items and generate YouTube assets (hooks, titles, descriptions, scripts)
7. **Review & Edit** - Review generated content and request changes
8. **Export & Archive** - Export to Obsidian vault and archive the run

## Data Models

### Core Entities

#### User
- `id` (PK)
- `openId` (unique, from OAuth)
- `name`, `email`
- `settings` (JSON: tone, format preferences, Obsidian vault path)
- `createdAt`, `updatedAt`

#### NewsSource
- `id` (PK)
- `userId` (FK)
- `name` (e.g., "TechCrunch RSS")
- `type` (enum: "rss", "gmail", "youtube", "website")
- `config` (JSON: URL, Gmail label, YouTube channel ID, etc.)
- `topics` (JSON array: ["AI", "Startups"])
- `isActive` (boolean)
- `createdAt`, `updatedAt`

#### Run
- `id` (PK)
- `userId` (FK)
- `status` (enum: "draft", "collecting", "compiling", "reviewing", "completed", "archived")
- `startedAt`, `completedAt`
- `stats` (JSON: itemsCollected, itemsCompiled, tokensUsed, contentItemsCreated)
- `createdAt`, `updatedAt`

#### RawHeadline
- `id` (PK)
- `runId` (FK)
- `sourceId` (FK)
- `title`, `description`, `url`, `publishedAt`
- `source` (enum: "rss", "gmail", "youtube", "website")
- `isSelected` (boolean)
- `createdAt`

#### CompiledItem
- `id` (PK)
- `runId` (FK)
- `topic` (string: homologated topic name)
- `hook` (string: short description)
- `summary` (string: extended summary)
- `sourceHeadlineIds` (JSON array: IDs of RawHeadlines that contributed)
- `isSelected` (boolean)
- `createdAt`, `updatedAt`

#### ContentPackage
- `id` (PK)
- `runId` (FK)
- `compiledItemId` (FK)
- `youtubeTitle`, `youtubeDescription`, `scriptOutline`
- `status` (enum: "draft", "ready", "exported")
- `createdAt`, `updatedAt`

#### RunArchive
- `id` (PK)
- `runId` (FK)
- `userId` (FK)
- `archivedData` (JSON: full run data for historical reference)
- `obsidianExportPath` (string)
- `archivedAt`

### Settings
- `id` (PK)
- `userId` (FK)
- `tone` (string: "professional", "casual", "technical")
- `format` (JSON: structure templates, cadence preferences)
- `obsidianVaultPath` (string)
- `llmModel` (string: default model to use)
- `updatedAt`

## Backend Services

### News Source Integrations

#### RSS Feed Parser
- Fetch and parse RSS feeds
- Extract title, description, link, publish date
- Handle errors and timeouts gracefully

#### Gmail Integration
- Connect via OAuth (requires user to authorize)
- Fetch emails with specific label
- Extract newsletter content and links

#### YouTube Integration
- Fetch latest videos from subscribed channels
- Extract title, description, video URL
- Parse video metadata

#### Website Scraper
- Fetch and parse website content
- Extract headlines and key information
- Handle dynamic content if needed

### AI Processing Service

#### Content Compilation
- Input: List of RawHeadlines with topics
- Process: Use LLM to homologate similar topics
- Output: CompiledItems with hooks and summaries

#### YouTube Asset Generation
- Input: CompiledItem with summary
- Process: Use LLM to generate YouTube-specific content
- Output: Title, description, script outline

### Obsidian Export Service
- Format compiled items and content packages
- Generate Markdown files
- Write to user's Obsidian vault directory

## API Endpoints (tRPC Procedures)

### Home Dashboard
- `dashboard.getLastRun()` - Get statistics from last completed run
- `dashboard.getRunHistory()` - Get list of past runs

### Sources Management
- `sources.list()` - Get all sources for user
- `sources.create()` - Add new source
- `sources.update()` - Modify source
- `sources.delete()` - Remove source
- `sources.testConnection()` - Verify source connectivity

### Runs & Workflow
- `runs.start()` - Create new run
- `runs.getStatus()` - Get current run status
- `runs.collectHeadlines()` - Fetch headlines from all active sources
- `runs.selectHeadlines()` - Mark headlines for compilation
- `runs.broadSearch()` - Perform web search for additional headlines

### Compilation & Content
- `compilation.compile()` - Process headlines into CompiledItems
- `compilation.getItems()` - List compiled items for current run
- `compilation.selectItems()` - Mark items for content package
- `content.generate()` - Create YouTube assets for selected items
- `content.getPackages()` - List generated content packages
- `content.updatePackage()` - Edit generated content
- `content.requestChanges()` - Request LLM to regenerate content

### Export & Archive
- `export.toObsidian()` - Export content to Obsidian vault
- `export.archiveRun()` - Archive completed run
- `archive.list()` - Get list of archived runs
- `archive.retrieve()` - Load archived run data

### Settings
- `settings.get()` - Get user settings
- `settings.update()` - Update tone, format, Obsidian path, etc.

## Frontend Routes

- `/` - Home dashboard
- `/sources` - Manage news sources
- `/run/inbox` - News inbox with raw headlines
- `/run/compile` - Review compiled items
- `/run/package` - Create content packages
- `/run/review` - Review and edit generated content
- `/settings` - User preferences
- `/archive` - View archived runs

## External APIs & Services

### Required
- **Manus LLM API** - For content generation and summarization
- **Manus Storage (S3)** - For storing exported files

### Optional (User-provided credentials)
- **Gmail API** - For newsletter integration
- **YouTube API** - For channel integration
- **NewsAPI** - For broader web search capability
- **Web scraping libraries** - For website content extraction

## Security & Privacy Considerations

1. **OAuth Authentication** - All users authenticated via Manus OAuth
2. **API Key Management** - Store external API keys securely in database (encrypted)
3. **Data Isolation** - All queries filtered by `userId`
4. **Rate Limiting** - Implement rate limits on news fetching and AI processing
5. **Obsidian Export** - User provides local vault path; app writes files locally

## Performance Considerations

1. **Caching** - Cache RSS feeds and website content to avoid repeated fetches
2. **Batch Processing** - Process multiple headlines in batch for LLM efficiency
3. **Pagination** - Paginate headline lists and compiled items
4. **Async Operations** - Use background jobs for long-running tasks (compilation, export)
5. **Database Indexing** - Index on `userId`, `runId`, `sourceId` for fast queries

## Error Handling Strategy

1. **Source Connection Failures** - Gracefully handle timeouts, 404s, network errors
2. **LLM Processing Failures** - Retry with exponential backoff; fallback to simpler processing
3. **Obsidian Export Failures** - Provide clear error messages and fallback options
4. **User Feedback** - Display clear error messages and recovery suggestions

## Future Enhancements

1. **Scheduled Runs** - Automate daily/weekly news collection
2. **Collaboration** - Share runs and content packages with team members
3. **Custom Webhooks** - Trigger runs via external events
4. **Advanced Analytics** - Track content performance metrics
5. **Multi-language Support** - Translate content to different languages
6. **Video Generation** - Integrate with video generation services
