# NewsForge Project TODO

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

## Phase 2: Backend Services - News Source Integration
- [ ] Implement RSS feed parser service
- [ ] Implement Gmail integration (OAuth setup and email fetching)
- [ ] Implement YouTube integration (channel video fetching)
- [ ] Implement website scraper service
- [ ] Create headline collection service that aggregates from all sources
- [ ] Implement error handling and retry logic for source failures

## Phase 3: Backend Services - AI Processing
- [ ] Implement content compilation service (homologate topics using LLM)
- [ ] Implement YouTube asset generation service (titles, descriptions, scripts)
- [ ] Implement content editing/regeneration service
- [ ] Integrate with Manus LLM API

## Phase 4: Backend Services - Export & Archive
- [ ] Implement Obsidian export service (format and write Markdown files)
- [ ] Implement run archiving service
- [ ] Implement archive retrieval service

## Phase 5: tRPC Procedures - Dashboard
- [ ] dashboard.getLastRun() - Get statistics from last completed run
- [ ] dashboard.getRunHistory() - Get list of past runs

## Phase 6: tRPC Procedures - Sources Management
- [ ] sources.list() - Get all sources for user
- [ ] sources.create() - Add new source
- [ ] sources.update() - Modify source
- [ ] sources.delete() - Remove source
- [ ] sources.testConnection() - Verify source connectivity

## Phase 7: tRPC Procedures - Runs & Workflow
- [ ] runs.start() - Create new run
- [ ] runs.getStatus() - Get current run status
- [ ] runs.collectHeadlines() - Fetch headlines from all active sources
- [ ] runs.selectHeadlines() - Mark headlines for compilation
- [ ] runs.broadSearch() - Perform web search for additional headlines

## Phase 8: tRPC Procedures - Compilation & Content
- [ ] compilation.compile() - Process headlines into CompiledItems
- [ ] compilation.getItems() - List compiled items for current run
- [ ] compilation.selectItems() - Mark items for content package
- [ ] content.generate() - Create YouTube assets for selected items
- [ ] content.getPackages() - List generated content packages
- [ ] content.updatePackage() - Edit generated content
- [ ] content.requestChanges() - Request LLM to regenerate content

## Phase 9: tRPC Procedures - Export & Archive
- [ ] export.toObsidian() - Export content to Obsidian vault
- [ ] export.archiveRun() - Archive completed run
- [ ] archive.list() - Get list of archived runs
- [ ] archive.retrieve() - Load archived run data

## Phase 10: tRPC Procedures - Settings
- [ ] settings.get() - Get user settings
- [ ] settings.update() - Update tone, format, Obsidian path, etc.

## Phase 11: Frontend - Layout & Navigation
- [ ] Design and implement main layout with navigation
- [ ] Create sidebar/navigation menu for workflow stages
- [ ] Implement responsive design for mobile and desktop

## Phase 12: Frontend - Home Dashboard
- [ ] Create Home page component
- [ ] Display last run statistics (date, results count, content items, tokens used)
- [ ] Add "Start New Run" button
- [ ] Display run history list
- [ ] Implement quick access to recent runs

## Phase 13: Frontend - Sources Management
- [ ] Create Sources page component
- [ ] Implement source list display
- [ ] Create add/edit source forms
- [ ] Implement source type selection (RSS, Gmail, YouTube, Website)
- [ ] Add topic input for each source
- [ ] Implement test connection button
- [ ] Add delete source functionality

## Phase 14: Frontend - News Inbox
- [ ] Create News Inbox page component
- [ ] Display raw headlines in list format
- [ ] Implement checkbox selection for headlines
- [ ] Add headline details (title, source, link, publish date)
- [ ] Implement broader web search interface
- [ ] Add search results display
- [ ] Implement "Continue to Compile" button

## Phase 15: Frontend - Compilation Review
- [ ] Create Compilation Review page component
- [ ] Display compiled items with topics, hooks, and summaries
- [ ] Implement checkbox selection for final items
- [ ] Add item details view
- [ ] Implement "Continue to Content Package" button

## Phase 16: Frontend - Content Package Generation
- [ ] Create Content Package page component
- [ ] Display selected compiled items
- [ ] Show generated YouTube assets (title, description, script outline)
- [ ] Implement content editing interface
- [ ] Add "Request Changes" button for LLM regeneration
- [ ] Implement "Finalize" button

## Phase 17: Frontend - Review & Edit
- [ ] Create Review & Edit page component
- [ ] Display all generated content packages
- [ ] Implement inline editing for YouTube assets
- [ ] Add change request interface
- [ ] Implement "Export to Obsidian" button
- [ ] Add "Archive Run" button

## Phase 18: Frontend - Settings
- [x] Create Settings page component
- [x] Implement tone preference selector
- [x] Add format/structure template editor
- [x] Implement Obsidian vault path input
- [x] Add LLM model selection
- [x] Implement save settings functionality

## Phase 19: Frontend - Archive
- [x] Create Archive page component with run history display
- [x] Display list of archived runs with filtering and sorting
- [x] Implement run details view/modal
- [ ] Add retrieve/restore functionality
- [ ] Implement export functionality for archived runs

## Phase 20: Testing & Optimization
- [ ] Write vitest tests for backend services
- [ ] Write vitest tests for tRPC procedures
- [ ] Test complete workflow end-to-end
- [ ] Optimize database queries
- [ ] Implement caching where appropriate
- [ ] Test error handling and edge cases

## Phase 21: Documentation & Deployment
- [ ] Create user documentation
- [ ] Create API documentation
- [ ] Set up deployment pipeline
- [ ] Create deployment checklist
- [ ] Prepare for production launch
