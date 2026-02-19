-- CreateEnum
CREATE TYPE "ContentTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'GENERATING', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "brandTone" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "writingGuidelines" TEXT NOT NULL DEFAULT '',
    "seoPreferences" JSONB NOT NULL DEFAULT '{}',
    "defaultAuthor" TEXT NOT NULL DEFAULT '',
    "contentRules" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_connections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'notion',
    "accessToken" TEXT NOT NULL,
    "triggerDatabaseId" TEXT NOT NULL DEFAULT '',
    "contentDatabaseId" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_tasks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'blog',
    "status" "ContentTaskStatus" NOT NULL DEFAULT 'PENDING',
    "triggerSource" TEXT NOT NULL DEFAULT 'api',
    "inputTopic" TEXT NOT NULL,
    "inputKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "output" JSONB,
    "publishedCmsId" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_logs" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "stage" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_apiKey_key" ON "tenants"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "brand_profiles_tenantId_key" ON "brand_profiles"("tenantId");

-- AddForeignKey
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_connections" ADD CONSTRAINT "cms_connections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_tasks" ADD CONSTRAINT "content_tasks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_logs" ADD CONSTRAINT "task_logs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "content_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
