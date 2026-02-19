# AI Content Agent - Product Requirements Document (PRD)

## Overview
A multi-tenant AI content agent that generates SEO-ready blog posts via AI (OpenAI GPT-4o) and publishes them to Notion CMS. Supports multiple companies (tenants) with isolated brand profiles and uses a modular skill-based agent architecture for extensibility.

---

## Problem Statement
Content teams spend hours writing, optimizing, and publishing blog posts. This system automates the full pipeline: topic in → SEO-optimized blog post published to Notion.

---

## Target Users
- Content teams managing multiple brand blogs
- Marketing agencies handling multiple client accounts
- Solo founders who need consistent content output

---

## Core Features

### 1. Multi-Tenant Support
- Each company (tenant) has its own brand profile, CMS connection, and content tasks
- Tenant isolation: one tenant's failure doesn't affect others
- API key authentication per tenant via `X-Tenant-Key` header

### 2. Brand Profile
- Company name, industry, brand tone, target audience
- Writing guidelines, SEO preferences, content rules
- Default author name
- All AI-generated content follows the brand profile

### 3. AI Blog Generation
- Input: topic + optional keywords
- Output: full blog post (title, slug, excerpt, markdown content, tags, read time)
- Uses structured AI output (Zod schema) for reliable formatting
- 800-1200 word posts

### 4. SEO Metadata Generation
- Meta title (50-60 chars), meta description (150-160 chars)
- Focus keyword + secondary keywords
- Open Graph title and description for social sharing

### 5. Notion CMS Publishing
- Publishes blog as a Notion page with all properties (title, slug, tags, SEO fields, etc.)
- Converts markdown to Notion blocks (headings, lists, quotes, bold text)
- Supports multiple Notion databases per tenant

### 6. Notion Polling (Auto-Trigger)
- Polls a Notion "trigger" database for rows with Status = "Ready"
- Automatically picks up topics, generates content, and publishes
- Updates trigger row status: Ready → Processing → Published/Failed

### 7. Retry & Error Handling
- Auto-retry up to 3 times with exponential backoff (2s, 4s, 8s)
- AI API calls retry on 429/500/502/503 errors
- Task lifecycle: PENDING → IN_PROGRESS → GENERATING → PUBLISHING → PUBLISHED/FAILED
- Per-task logging in TaskLog table

---

## Tech Stack
| Component | Technology |
|-----------|-----------|
| Backend | Node.js + TypeScript + Express |
| Database | PostgreSQL + Prisma ORM |
| AI | OpenAI GPT-4o (structured output) |
| CMS | Notion API |
| Validation | Zod |
| Testing | Vitest |
| Logging | Winston |

---

## API Endpoints

All under `/api/v1`, authenticated via `X-Tenant-Key` header.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/tenants` | Create tenant |
| GET | `/tenants/:id` | Get tenant + brand profile |
| PATCH | `/tenants/:id` | Update tenant |
| PUT | `/tenants/:id/brand-profile` | Upsert brand profile |
| POST | `/tenants/:id/cms-connections` | Register Notion connection |
| POST | `/content/generate` | Submit blog generation task |
| GET | `/content/tasks` | List tasks (paginated, filtered) |
| GET | `/content/tasks/:taskId` | Get task + output + logs |
| POST | `/content/tasks/:taskId/retry` | Retry failed task |
| POST | `/webhooks/notion/poll` | Manually trigger Notion poll |

---

## Database Schema

### Tables
1. **Tenant** - id, name, slug, apiKey, isActive
2. **BrandProfile** - companyName, industry, brandTone, targetAudience, writingGuidelines, seoPreferences, defaultAuthor, contentRules
3. **CMSConnection** - provider, accessToken, triggerDatabaseId, contentDatabaseId, config
4. **ContentTask** - contentType, status, triggerSource, inputTopic, inputKeywords, output, publishedCmsId, retryCount
5. **TaskLog** - level, stage, message, metadata

---

## Architecture

```
HTTP Request / Notion Poll
        |
  ContentController.generate()
        |
  Create ContentTask (PENDING)
        |
  Orchestrator.executeTask(taskId)
        |
  Build AgentContext (tenant + brand profile + CMS)
        |
  Pipeline.run(['blog-generation', 'seo-metadata', 'cms-publish'])
        |
        +---> blog-generation.skill --> artifacts.blogDraft
        +---> seo-metadata.skill --> artifacts.seoMetadata
        +---> cms-publish.skill --> Notion page created
        |
  Success: status=PUBLISHED | Failure: retry or status=FAILED
```

---

## Design Patterns
1. **Skill Plugin System** - Stateless skills with `canExecute()` + `execute()`, shared state in PipelineArtifacts
2. **AI Provider Abstraction** - `IAIProvider` interface, swap OpenAI for another provider without touching skills
3. **CMS Adapter Pattern** - `ICMSAdapter` interface, add WordPress/Ghost/etc without touching skills
4. **Pipeline Runner** - Sequential execution, abort on first failure
5. **Tenant Resolver Middleware** - Loads tenant context from API key header

---

## Future Enhancements
- [ ] Web UI for non-technical users
- [ ] WhatsApp/Slack integration for triggering content
- [ ] WordPress, Ghost CMS adapters
- [ ] Image generation for blog headers
- [ ] Content calendar and scheduling
- [ ] Analytics dashboard
- [ ] Claude/Gemini AI provider options
