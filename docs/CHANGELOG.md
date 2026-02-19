# Changelog

All notable changes to this project will be documented in this file.

---

## [1.0.0] - 2026-02-17

### Initial Release - Full Implementation

#### Phase 1: Foundation
- Project setup: package.json, tsconfig.json, docker-compose.yml, .env
- Prisma schema with 5 tables: Tenant, BrandProfile, CMSConnection, ContentTask, TaskLog
- Config loader (dotenv), Winston logger, Prisma DB singleton
- Error classes: AppError, ValidationError, NotFoundError, AIProviderError, CMSPublishError
- Middleware: errorHandler, requestLogger, tenantResolver, validateRequest (Zod)
- Tenant module: full CRUD + brand profile upsert + CMS connection registration
- Express server with health endpoint at `/api/v1/health`

#### Phase 2: Agent Core + Blog Generation
- AI provider abstraction: IAIProvider interface + OpenAI implementation with structured output (Zod)
- Skill plugin system: ISkill interface, SkillRegistry, Pipeline sequential runner
- BlogGenerationSkill: generates full blog posts (title, slug, excerpt, markdown content, tags, read time)
- Orchestrator: builds AgentContext, runs pipeline, manages task lifecycle
- Content module: POST /content/generate, GET /tasks, GET /tasks/:taskId, POST /tasks/:taskId/retry
- Utility functions: retry with exponential backoff, slug generation, read time calculation

#### Phase 3: SEO + Notion Publishing
- SEOMetadataSkill: generates meta title, meta description, focus keyword, secondary keywords, OG data
- CMS adapter pattern: ICMSAdapter interface + factory
- NotionAdapter: full Notion API integration (create pages, update properties)
- NotionMapper: converts markdown to Notion blocks (headings, lists, quotes, bold text)
- CMSPublishSkill: publishes blog + SEO metadata to Notion as a page

#### Phase 4: Notion Polling + Retry Logic
- NotionPoller: interval-based polling of trigger databases for all active tenants
- Auto-retry with exponential backoff (2s, 4s, 8s) up to 3 attempts on task failure
- Trigger status lifecycle: Ready → Processing → Published/Failed
- Graceful shutdown: stops poller, closes DB connection, stops HTTP server
- Webhook endpoint for manual poll trigger

#### Phase 5: Polish
- Zod request validation on all input endpoints
- Paginated task listing with status filtering
- Prisma seed file with sample tenant data
- 31 unit tests across 6 test files (slug, readTime, retry, SkillRegistry, Pipeline, NotionMapper)
- Vitest configuration

### Files Created: 66 total
- 45 TypeScript source files
- 6 test files
- 15 config/schema/docs files
