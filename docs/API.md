# API Reference

Base URL: `http://localhost:3000/api/v1`

All endpoints (except health) require the `X-Tenant-Key` header.

---

## Health Check

```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-17T12:00:00.000Z"
}
```

---

## Tenants

### Create Tenant
```
POST /tenants
Content-Type: application/json

{
  "name": "Acme Tech",
  "slug": "acme-tech"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Acme Tech",
  "slug": "acme-tech",
  "apiKey": "tak_abc123...",
  "isActive": true,
  "brandProfile": null,
  "cmsConnections": []
}
```

> Save the `apiKey` - you'll use it as `X-Tenant-Key` for all other requests.

### Get Tenant
```
GET /tenants/:id
X-Tenant-Key: tak_abc123...
```

### Update Tenant
```
PATCH /tenants/:id
X-Tenant-Key: tak_abc123...
Content-Type: application/json

{
  "name": "New Name",
  "isActive": false
}
```

---

## Brand Profile

### Upsert Brand Profile
```
PUT /tenants/:id/brand-profile
X-Tenant-Key: tak_abc123...
Content-Type: application/json

{
  "companyName": "Acme Tech Solutions",
  "industry": "Technology",
  "brandTone": "Professional yet approachable",
  "targetAudience": "Tech professionals aged 25-45",
  "writingGuidelines": "Use active voice. Include examples.",
  "defaultAuthor": "Acme Editorial",
  "seoPreferences": { "focusOnLongTail": true },
  "contentRules": ["Include actionable takeaways"]
}
```

---

## CMS Connections

### Register Notion Connection
```
POST /tenants/:id/cms-connections
X-Tenant-Key: tak_abc123...
Content-Type: application/json

{
  "accessToken": "ntn_your_notion_token",
  "contentDatabaseId": "your_notion_database_id",
  "triggerDatabaseId": "optional_trigger_database_id"
}
```

---

## Content Generation

### Generate Blog Post
```
POST /content/generate
X-Tenant-Key: tak_abc123...
Content-Type: application/json

{
  "topic": "Why TypeScript is Essential for Large-Scale Applications",
  "keywords": ["typescript", "scalability", "type safety"]
}
```

**Response (202):**
```json
{
  "message": "Content generation started",
  "taskId": "uuid",
  "status": "PENDING"
}
```

> The task runs in the background. Poll the task endpoint to check progress.

### List Tasks
```
GET /content/tasks?page=1&limit=20&status=PUBLISHED
X-Tenant-Key: tak_abc123...
```

**Response:**
```json
{
  "tasks": [...],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

### Get Task Details
```
GET /content/tasks/:taskId
X-Tenant-Key: tak_abc123...
```

**Response:**
```json
{
  "id": "uuid",
  "status": "PUBLISHED",
  "inputTopic": "Why TypeScript...",
  "inputKeywords": ["typescript", "scalability"],
  "output": {
    "blog": {
      "title": "Why TypeScript is Essential...",
      "slug": "why-typescript-is-essential",
      "excerpt": "Discover why...",
      "content": "## Introduction\n...",
      "author": "Acme Editorial",
      "readTimeMinutes": 5,
      "tags": ["typescript", "engineering", "best-practices"]
    },
    "seo": {
      "metaTitle": "Why TypeScript is Essential | Acme Tech",
      "metaDescription": "Learn why TypeScript...",
      "focusKeyword": "typescript large scale",
      "secondaryKeywords": ["type safety", "scalability"],
      "ogTitle": "Why TypeScript is Essential",
      "ogDescription": "A deep dive into..."
    },
    "publishedCmsId": "notion-page-id",
    "publishedUrl": "https://notion.so/..."
  },
  "logs": [
    { "level": "INFO", "stage": "orchestrator", "message": "Task execution started" },
    { "level": "INFO", "stage": "orchestrator", "message": "Task completed with status PUBLISHED" }
  ]
}
```

### Retry Failed Task
```
POST /content/tasks/:taskId/retry
X-Tenant-Key: tak_abc123...
```

---

## Webhooks

### Trigger Notion Poll
```
POST /webhooks/notion/poll
```

Manually triggers a poll cycle to check all Notion trigger databases for new "Ready" rows.

---

## Task Status Flow

```
PENDING → IN_PROGRESS → GENERATING → PUBLISHING → PUBLISHED
                                                 ↘ FAILED (after 3 retries)
```

## Error Responses

```json
{
  "error": "Description of what went wrong"
}
```

| Status Code | Meaning |
|-------------|---------|
| 400 | Validation error (bad input) |
| 401 | Missing or invalid X-Tenant-Key |
| 403 | Tenant is deactivated |
| 404 | Resource not found |
| 500 | Internal server error |
| 502 | AI provider or CMS error |
