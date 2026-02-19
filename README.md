# AI Content Agent - Blog Automation

Multi-tenant AI agent that generates SEO-ready blog posts and publishes them to Notion.

**Input:** A topic + optional keywords
**Output:** A full blog post with SEO metadata, published to your Notion database

## Quick Start

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Setup database
npm install
npm run db:migrate
npm run db:seed        # prints your API key

# 3. Add your keys to .env
OPENAI_API_KEY=sk-your-key
# Notion token is added via API (see below)

# 4. Start server
npm run dev            # runs on http://localhost:3000
```

## Generate a Blog Post

```bash
# Replace YOUR_API_KEY with the key from seed output
# Replace YOUR_TENANT_ID with the tenant ID

# Step 1: Add Notion connection
curl -X POST http://localhost:3000/api/v1/tenants/YOUR_TENANT_ID/cms-connections \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Key: YOUR_API_KEY" \
  -d '{"accessToken":"ntn_your_token","contentDatabaseId":"your_db_id"}'

# Step 2: Generate!
curl -X POST http://localhost:3000/api/v1/content/generate \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Key: YOUR_API_KEY" \
  -d '{"topic":"Why TypeScript is Essential","keywords":["typescript","scalability"]}'

# Step 3: Check status
curl http://localhost:3000/api/v1/content/tasks/TASK_ID \
  -H "X-Tenant-Key: YOUR_API_KEY"
```

## Documentation

| Doc | Description |
|-----|-------------|
| [PRD](docs/PRD.md) | Product requirements and features |
| [Architecture](docs/ARCHITECTURE.md) | Folder structure, request flow, design decisions |
| [API Reference](docs/API.md) | All endpoints with request/response examples |
| [Changelog](docs/CHANGELOG.md) | What was built and when |

## Tech Stack

Node.js + TypeScript + Express + PostgreSQL + Prisma + OpenAI + Notion API + Zod + Vitest + Winston

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled build |
| `npm test` | Run all tests |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed sample data |
