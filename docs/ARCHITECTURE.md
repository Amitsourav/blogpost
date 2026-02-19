# Architecture Guide

## Folder Structure

```
ai-agent-blog-automation/
├── .env / .env.example / .gitignore
├── tsconfig.json / package.json / nodemon.json
├── docker-compose.yml              # PostgreSQL local dev
├── vitest.config.ts                # Test configuration
├── prisma/
│   ├── schema.prisma               # All DB models (5 tables)
│   └── seed.ts                     # Sample tenant data
├── docs/
│   ├── PRD.md                      # Product Requirements Document
│   ├── CHANGELOG.md                # What was built and when
│   ├── ARCHITECTURE.md             # This file
│   └── API.md                      # API reference with examples
├── src/
│   ├── index.ts                    # Bootstrap + startup + graceful shutdown
│   ├── server.ts                   # Express app factory + route mounting
│   ├── config/
│   │   ├── index.ts                # Env config loader (port, keys, flags)
│   │   ├── database.ts             # Prisma client singleton
│   │   └── logger.ts               # Winston logger (JSON in prod, colorized in dev)
│   ├── common/
│   │   ├── errors/                 # AppError, AIProviderError, CMSPublishError, ValidationError, NotFoundError
│   │   ├── middleware/             # errorHandler, requestLogger, tenantResolver, validateRequest
│   │   ├── types/                  # content.types.ts, agent.types.ts, tenant.types.ts
│   │   └── utils/                  # retry.ts, slug.ts, readTime.ts
│   ├── modules/
│   │   ├── tenant/                 # controller, service, repository, routes, validator
│   │   ├── content/                # controller, service, repository, routes, validator
│   │   └── webhook/                # Manual Notion poll trigger endpoint
│   ├── agent/
│   │   ├── orchestrator.ts         # Main task orchestrator (runs pipeline, handles retries)
│   │   ├── skill-registry.ts       # Skill discovery + registration
│   │   ├── skill.interface.ts      # ISkill contract (canExecute + execute)
│   │   ├── context.ts              # AgentContext builder
│   │   ├── pipeline.ts             # Sequential skill runner (abort on failure)
│   │   ├── register-skills.ts      # Registers all skills at startup
│   │   └── skills/
│   │       ├── blog-generation.skill.ts    # AI generates full blog post
│   │       ├── seo-metadata.skill.ts       # AI generates SEO metadata
│   │       └── cms-publish.skill.ts        # Publishes to CMS
│   └── providers/
│       ├── ai/
│       │   ├── ai-provider.interface.ts    # IAIProvider (generate + generateStructured)
│       │   ├── ai-provider.factory.ts      # Provider factory
│       │   └── openai.provider.ts          # OpenAI GPT-4o implementation
│       └── cms/
│           ├── cms-adapter.interface.ts    # ICMSAdapter (publish + poll + status updates)
│           ├── cms-adapter.factory.ts      # Adapter factory
│           └── notion/
│               ├── notion.adapter.ts       # Notion API integration
│               ├── notion.mapper.ts        # Markdown → Notion blocks converter
│               └── notion.poller.ts        # Polls trigger database every 60s
```

---

## Request Flow

### Blog Generation (API Trigger)
```
Client sends POST /api/v1/content/generate
  → tenantResolver middleware loads tenant from X-Tenant-Key
  → validateRequest checks body with Zod schema
  → ContentController.generate()
  → ContentService.generateContent()
      → Creates ContentTask (status: PENDING)
      → Fires orchestrator.executeTask() asynchronously
      → Returns taskId immediately (HTTP 202)
  → Orchestrator:
      → Loads task + tenant + brand profile + CMS connection
      → Updates status: IN_PROGRESS → GENERATING
      → Builds AgentContext
      → Runs Pipeline with skills:
          1. blog-generation → AI generates blog draft → artifacts.blogDraft
          2. seo-metadata → AI generates SEO data → artifacts.seoMetadata
          3. cms-publish → Publishes to Notion → artifacts.publishedCmsId
      → Updates task: status=PUBLISHED, output=ContentOutput
      → On failure: auto-retry up to 3x, then status=FAILED
```

### Notion Polling (Auto Trigger)
```
NotionPoller runs every 60s (if enabled)
  → Loads all active tenants with CMS connections
  → For each Notion connection with a triggerDatabaseId:
      → Queries Notion for rows where Status = "Ready"
      → For each trigger:
          → Marks trigger as "Processing"
          → Creates ContentTask (triggerSource: "notion")
          → Runs orchestrator.executeTask()
          → On success: marks trigger as "Published"
          → On failure: marks trigger as "Failed"
```

---

## Key Design Decisions

### Why Skill Plugin System?
Skills are stateless and composable. To add a new capability (e.g., image generation), you:
1. Create `image-generation.skill.ts` implementing ISkill
2. Register it in `register-skills.ts`
3. Add it to the pipeline array

No existing code needs to change.

### Why AI Provider Abstraction?
The `IAIProvider` interface has two methods:
- `generate()` - returns raw string
- `generateStructured<T>()` - returns typed object via Zod schema

To swap OpenAI for Claude/Gemini, create a new provider implementing this interface. Skills never know which AI they're talking to.

### Why CMS Adapter Pattern?
The `ICMSAdapter` interface abstracts CMS operations. To add WordPress support, create `wordpress.adapter.ts` and update the factory. No skill code changes.

### Why Async Task Execution?
`POST /content/generate` returns immediately with a taskId (HTTP 202). The actual AI generation + publishing happens in the background. This prevents HTTP timeouts on slow AI calls and lets the client poll for status.
