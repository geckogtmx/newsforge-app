# NewsForge TODO

**GitHub Repository**: https://github.com/geckogtmx/newsforge-app  
**Local Repository**: E:\git\newsforge-app  
**Preview URL**: https://newsforge-gbxpkwzy.manus.space/  
**Last Updated**: 2026-01-10

---Project TODO

## Phase 1: Database Schema & Data Models
- [x] Create NewsSource table (id, userId, name, type, config, topics, isActive)
- [x] Create Run table (id, userId, status, startedAt, completedAt, stats)
- [x] Create RawHeadline table (id, runId, sourceId, title, description, url, publishedAt, source, isSelected)
- [x] Create CompiledItem table (id, runId, topic, hook, summary, sourceHeadlineIds, isSelected)
- [x] Create ContentPackage table (id, runId, compiledItemId, youtubeTitle, youtubeDescription, scriptOutline, status)
- [x] Create RunArchive table (id, runId, userId, archivedData, obsidianExportPath, archivedAt)
- [x] Create Settings table (id, userId, tone, format, obsidianVaultPath, llmModel)
- [x] Run database migrations
- [x] Create database helper functions in server/db.ts
- [x] Add lastFetchedAt field to NewsSource table for incremental runs
- [x] Add quality score fields to NewsSource table (selectionRate, finalRate, userRating)
- [x] Create KeywordAlert table for topic monitoring
- [x] Create HeadlineEmbedding table for semantic deduplication
- [x] Add costEstimate and tokenUsage fields to Run table
- [x] Add isIncremental field to Run table
- [x] Add budget tracking fields to userSettings table

## Phase 2: Backend Services - News Source Integration
- [x] Implement RSS feed parser service
- [x] Implement Gmail integration (OAuth setup and email fetching)
- [x] Implement YouTube integration (channel video fetching)
- [x] Implement website scraper service
- [x] Create headline collection service that aggregates from all sources
- [x] Implement error handling and retry logic for source failures
- [ ] Add incremental fetching (only fetch items after lastFetchedAt)
- [ ] Implement source connection testing

## Phase 3: Smart Deduplication Engine
- [x] Implement embedding generation service for headlines
- [x] Implement semantic similarity detection (cosine similarity)
- [x] Create headline grouping algorithm
- [x] Implement "heat score" calculation (number of sources covering same story)
- [x] Create service to select best version from duplicate group
- [ ] Add deduplication to headline aggregation workflow
- [x] Add database fields for deduplication (groupId, heatScore, isBestVersion)
- [x] Create headlineEmbeddings table

## Phase 4: Source Quality Scoring System
- [ ] Implement selection rate tracking (% of headlines selected for compilation)
- [ ] Implement final rate tracking (% that make it to content packages)
- [ ] Add user rating system (thumbs up/down per source)
- [ ] Create quality score calculation algorithm
- [ ] Implement auto-prioritization in NewsInbox (sort by quality × recency × relevance)
- [ ] Add option to auto-hide low-scoring sources

## Phase 5: Keyword/Topic Alerts
- [ ] Create keyword alert management (add/edit/delete watchwords)
- [ ] Implement keyword matching in headline collection
- [ ] Add desktop notification system for keyword matches
- [ ] Implement auto-tagging for matched headlines
- [ ] Add highlighting in NewsInbox for alerted topics

## Phase 6: Cost Prediction & Budget Management
- [ ] Implement token estimation for compilation operations
- [ ] Create cost prediction service (estimate before run)
- [ ] Add monthly budget tracking
- [ ] Implement budget limit enforcement
- [ ] Create per-source cost tracking
- [ ] Add cost analytics dashboard

## Phase 7: Backend Services - AI Processing
- [ ] Implement content compilation service (homologate topics using LLM)
- [ ] Implement YouTube asset generation service (titles, descriptions, scripts)
- [ ] Implement content editing/regeneration service
- [ ] Integrate with Manus LLM API
- [ ] Add support for Claude 3.5 Sonnet
- [ ] Add support for OpenAI GPT models
- [ ] Implement model selection in settings

## Phase 8: Backend Services - Export & Archive
- [ ] Implement Obsidian export service (format and write Markdown files)
- [ ] Implement backlink generation between related topics
- [ ] Create daily/weekly index note generation
- [ ] Add tag generation (sources, dates, topics)
- [ ] Implement batch export for multiple compilations
- [ ] Implement run archiving service
- [ ] Implement archive retrieval service

## Phase 9: tRPC Procedures - Dashboard
- [ ] dashboard.getLastRun() - Get statistics from last completed run
- [ ] dashboard.getRunHistory() - Get list of past runs
- [ ] dashboard.getCostAnalytics() - Get cost breakdown and usage stats

## Phase 10: tRPC Procedures - Sources Management
- [x] sources.list() - Get all sources for user
- [x] sources.create() - Add new source
- [x] sources.update() - Modify source
- [x] sources.delete() - Remove source
- [ ] sources.testConnection() - Verify source connectivity
- [ ] sources.updateQualityScore() - Update quality metrics
- [ ] sources.rateSource() - User rating (thumbs up/down)

## Phase 11: tRPC Procedures - Runs & Workflow
- [x] runs.start() - Create new run
- [x] runs.getStatus() - Get current run status
- [x] runs.collectHeadlines() - Fetch headlines from all active sources
- [x] runs.selectHeadlines() - Mark headlines for compilation
- [ ] runs.broadSearch() - Perform web search for additional headlines
- [ ] runs.estimateCost() - Predict cost before compilation
- [ ] runs.getHistory() - Get run history with stats

## Phase 12: tRPC Procedures - Deduplication
- [ ] dedup.groupHeadlines() - Group similar headlines
- [ ] dedup.getGroups() - Get deduplicated headline groups
- [ ] dedup.selectBestVersion() - Choose best headline from group

## Phase 13: tRPC Procedures - Keyword Alerts
- [ ] alerts.list() - Get all keyword alerts
- [ ] alerts.create() - Add new keyword alert
- [ ] alerts.update() - Modify keyword alert
- [ ] alerts.delete() - Remove keyword alert
- [ ] alerts.checkMatches() - Check headlines for keyword matches

## Phase 14: tRPC Procedures - Compilation & Content
- [ ] compilation.compile() - Process headlines into CompiledItems
- [ ] compilation.getItems() - List compiled items for current run
- [ ] compilation.selectItems() - Mark items for content package
- [ ] content.generate() - Create YouTube assets for selected items
- [ ] content.getPackages() - List generated content packages
- [ ] content.updatePackage() - Edit generated content
- [ ] content.requestChanges() - Request LLM to regenerate content

## Phase 15: tRPC Procedures - Export & Archive
- [ ] export.toObsidian() - Export content to Obsidian vault
- [ ] export.batchExport() - Export multiple compilations
- [ ] export.generateBacklinks() - Create backlinks between notes
- [ ] export.createIndexNote() - Generate daily/weekly index
- [ ] export.archiveRun() - Archive completed run
- [ ] archive.list() - Get list of archived runs
- [ ] archive.retrieve() - Load archived run data

## Phase 16: tRPC Procedures - Settings
- [ ] settings.get() - Get user settings
- [ ] settings.update() - Update tone, format, Obsidian path, etc.
- [ ] settings.updateBudget() - Set monthly budget limit
- [ ] settings.selectModel() - Choose LLM model (Claude/GPT)

## Phase 17: Frontend - Layout & Navigation
- [x] Design and implement main layout with navigation
- [x] Create sidebar/navigation menu for workflow stages
- [x] Implement responsive design for mobile and desktop

## Phase 18: Frontend - Home Dashboard
- [x] Create Home page component
- [x] Display last run statistics (date, results count, content items, tokens used)
- [x] Add "Start New Run" button
- [ ] Display run history list with real data
- [ ] Implement quick access to recent runs
- [ ] Add cost analytics widget
- [ ] Display budget usage progress

## Phase 19: Frontend - Sources Management
- [x] Create Sources page component
- [x] Implement source list display
- [x] Create add/edit source forms
- [x] Implement source type selection (RSS, Gmail, YouTube, Website)
- [x] Add topic input for each source
- [ ] Implement test connection button
- [ ] Add delete source functionality
- [ ] Display quality score per source
- [ ] Add user rating interface (thumbs up/down)
- [ ] Implement source prioritization settings

## Phase 20: Frontend - News Inbox
- [x] Create News Inbox page component
- [x] Display raw headlines in list format
- [x] Implement checkbox selection for headlines
- [x] Add headline details (title, source, link, publish date)
- [x] Implement broader web search interface
- [x] Add search results display
- [x] Implement "Continue to Compile" button
- [ ] Display deduplicated headline groups
- [ ] Show "heat score" (number of sources)
- [ ] Highlight keyword-matched headlines
- [ ] Implement quality-based sorting
- [ ] Add "Quick Check" mode for incremental runs

## Phase 21: Frontend - Compilation Review
- [x] Create Compilation Review page component
- [x] Display compiled items with topics, hooks, and summaries
- [x] Implement checkbox selection for final items
- [x] Add item details view
- [x] Implement "Continue to Content Package" button
- [ ] Show source attribution for each compiled item
- [ ] Display related headlines that were grouped

## Phase 22: Frontend - Content Package Generation
- [x] Create Content Package page component
- [x] Display selected compiled items
- [x] Show generated YouTube assets (title, description, script outline)
- [x] Implement content editing interface
- [x] Add "Request Changes" button for LLM regeneration
- [x] Implement "Finalize" button
- [ ] Show cost estimate before generation
- [ ] Display token usage per package

## Phase 23: Frontend - Review & Edit
- [ ] Create Review & Edit page component
- [ ] Display all generated content packages
- [ ] Implement inline editing for YouTube assets
- [ ] Add change request interface
- [ ] Implement "Export to Obsidian" button
- [ ] Add "Archive Run" button
- [ ] Show export preview

## Phase 24: Frontend - Settings
- [x] Create Settings page component
- [x] Implement tone preference selector
- [x] Add format/structure template editor
- [x] Implement Obsidian vault path input
- [x] Add LLM model selection
- [x] Implement save settings functionality
- [ ] Add budget limit configuration
- [ ] Add keyword alert management interface
- [ ] Add model selection (Claude 3.5 Sonnet / GPT-4)
- [ ] Add incremental run preferences

## Phase 25: Frontend - Archive
- [x] Create Archive page component with run history display
- [x] Display list of archived runs with filtering and sorting
- [x] Implement run details view/modal
- [ ] Add retrieve/restore functionality
- [ ] Implement export functionality for archived runs
- [ ] Display cost per run in archive
- [ ] Add batch export interface

## Phase 26: Frontend - Keyword Alerts
- [ ] Create Keyword Alerts management page
- [ ] Add keyword alert creation form
- [ ] Display active alerts list
- [ ] Implement alert editing/deletion
- [ ] Show notification history
- [ ] Add alert statistics (matches per keyword)

## Phase 27: Frontend - Cost Analytics
- [ ] Create Cost Analytics dashboard
- [ ] Display monthly spending chart
- [ ] Show cost per source breakdown
- [ ] Display cost per run history
- [ ] Add budget progress indicator
- [ ] Show token usage trends

## Phase 28: Testing & Optimization
- [ ] Write vitest tests for backend services
- [ ] Write vitest tests for tRPC procedures
- [ ] Test complete workflow end-to-end
- [ ] Test deduplication engine accuracy
- [ ] Test incremental run performance
- [ ] Test quality scoring algorithm
- [ ] Optimize database queries
- [ ] Implement caching where appropriate
- [ ] Test error handling and edge cases
- [ ] Test cost prediction accuracy

## Phase 29: Documentation & Deployment
- [ ] Create user documentation
- [ ] Create API documentation
- [ ] Document deduplication algorithm
- [ ] Document quality scoring system
- [ ] Set up deployment pipeline
- [ ] Create deployment checklist
- [ ] Prepare for production launch


## Current Phase: Source Quality Scoring & Keyword Alerts
- [x] Implement quality scoring service with calculation algorithm
- [ ] Create tRPC procedures for quality score tracking and updates
- [x] Create keyword alert service with matching algorithm
- [x] Create tRPC procedures for keyword alert management (CRUD)
- [x] Implement desktop notification service
- [x] Build keyword alerts management UI page
- [ ] Add quality score display to Sources page
- [ ] Add keyword alert highlights to News Inbox
- [ ] Test quality scoring with real data
- [ ] Test keyword alerts and notifications


## Current Phase: Connect Frontend to Backend
- [x] Update Sources page to use trpc.sources.getSources query
- [x] Add quality score display with color-coded badges to Sources page
- [x] Implement source creation form with API configuration
- [x] Add source editing and deletion functionality
- [x] Add testConnection procedure to sources router
- [x] Update Dashboard to use trpc.runs.getRunHistory query
- [x] Display real run statistics on Dashboard
- [x] Implement "Start New Run" workflow with trpc.runs.startRun mutation
- [ ] Connect News Inbox to display real headlines from database
- [ ] Add headline selection persistence to database
- [ ] Test complete workflow from source creation to headline collection


## Current Phase: AI Content Compilation
- [x] Create AI compilation service using Manus LLM API
- [x] Implement topic homologation algorithm to group similar headlines
- [x] Integrate smart deduplication engine into compilation workflow
- [x] Generate hooks (short descriptions) for each compiled item
- [x] Generate extended summaries for each compiled item
- [x] Create tRPC procedure for compileHeadlines
- [x] Create tRPC procedure for getCompiledItems
- [x] Create tRPC procedure for regenerateItem
- [x] Create tRPC procedure for updateSelection
- [x] Add compilation router to main appRouter
- [x] Fix database schema to use string IDs for compiledItems and contentPackages
- [ ] Update runs router to trigger compilation after headline collection
- [ ] Connect Compilation Review page to display real compiled items
- [ ] Test compilation with real headlines from multiple sources

## Current Task: Connect Compilation Page to Backend
- [x] Update Compilation.tsx to use trpc.compilation.getCompiledItems
- [x] Display real compiled items with topics, hooks, and summaries
- [x] Implement regenerate functionality with custom instructions dialog
- [x] Add selection persistence with trpc.compilation.updateSelection
- [x] Show heat scores and source headline counts
- [ ] Test compilation workflow end-to-end


## Current Task: YouTube Asset Generation
- [x] Create YouTube asset generation service using Manus LLM API
- [x] Implement title generation (catchy, SEO-optimized, under 100 chars)
- [x] Implement description generation (detailed, with timestamps, links)
- [x] Implement script outline generation (intro, main points, outro)
- [x] Create tRPC router for YouTube asset generation
- [x] Add generateAssets procedure
- [x] Add regenerateAsset procedure for individual assets
- [x] Add updateAsset procedure for manual editing
- [x] Add markReady procedure for export status
- [x] Connect Content Package page to backend
- [x] Display generated YouTube assets with inline editing
- [x] Add copy-to-clipboard functionality
- [x] Add regenerate dialog with custom instructions
- [ ] Test YouTube asset generation end-to-end


## Current Task: Obsidian Export Service
- [x] Create Obsidian export service with Markdown generation
- [x] Implement YAML frontmatter generation (date, topic, sources, tags, heatScore)
- [x] Implement backlinks between related items
- [x] Create nested folder structure (YYYY/MM/DD)
- [x] Implement automatic tagging based on topics and keywords
- [x] Create batch export functionality for multiple packages
- [x] Create daily index file generation
- [x] Create knowledge graph file generation
- [x] Create tRPC procedures for export operations
- [x] Add exportPackage procedure (single export)
- [x] Add exportRun procedure (batch export with archiving)
- [x] Add getExportHistory procedure
- [x] Add export router to main appRouter
- [x] Connect Content Package page to export functionality
- [x] Add export button to Content Package page header
- [ ] Test Obsidian export end-to-end with real data


## Current Task: End-to-End Testing
- [ ] Set up test RSS feeds (TechCrunch, Hacker News, etc.)
- [ ] Create test sources in the database
- [ ] Start a new run and verify headline collection
- [ ] Test News Inbox display and selection
- [ ] Test AI compilation with real headlines
- [ ] Test YouTube asset generation
- [ ] Test Obsidian export with real data
- [ ] Fix any issues discovered during testing
- [ ] Document the complete workflow

## Current Issues to Fix
- [x] Connect News Inbox to backend - replace mock data with real headlines from database using trpc.runs.getHeadlines
- [x] Fix routing issue - ensure /compilation route is properly configured in App.tsx
- [x] Implement actual RSS feed testing in sources.testConnection procedure
- [x] Verify headline aggregation is working correctly when starting a new run
- [x] Add BBC News RSS feed to test parsing functionality
- [x] Debug why TechCrunch RSS feed isn't returning headlines - Fixed JSON parsing issue in aggregateHeadlines
- [x] Verify headlines are being saved to database during run - 54 headlines collected successfully
