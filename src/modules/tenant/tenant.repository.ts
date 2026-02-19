import { prisma } from '../../config/database';
import {
  CreateTenantInput,
  UpdateTenantInput,
  UpsertBrandProfileInput,
  CreateCMSConnectionInput,
} from '../../common/types';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';

export class TenantRepository {
  async create(input: CreateTenantInput) {
    const apiKey = `tak_${crypto.randomBytes(24).toString('hex')}`;
    return prisma.tenant.create({
      data: {
        id: uuid(),
        name: input.name,
        slug: input.slug,
        apiKey,
      },
      include: { brandProfile: true, cmsConnections: true },
    });
  }

  async findById(id: string) {
    return prisma.tenant.findUnique({
      where: { id },
      include: { brandProfile: true, cmsConnections: true },
    });
  }

  async findBySlug(slug: string) {
    return prisma.tenant.findUnique({
      where: { slug },
      include: { brandProfile: true, cmsConnections: true },
    });
  }

  async update(id: string, input: UpdateTenantInput) {
    return prisma.tenant.update({
      where: { id },
      data: input,
      include: { brandProfile: true, cmsConnections: true },
    });
  }

  async upsertBrandProfile(tenantId: string, input: UpsertBrandProfileInput) {
    return prisma.brandProfile.upsert({
      where: { tenantId },
      create: {
        id: uuid(),
        tenantId,
        ...input,
        seoPreferences: input.seoPreferences ?? {},
        contentRules: input.contentRules ?? [],
      },
      update: {
        ...input,
        seoPreferences: input.seoPreferences ?? undefined,
        contentRules: input.contentRules ?? undefined,
      },
    });
  }

  async createCMSConnection(tenantId: string, input: CreateCMSConnectionInput) {
    return prisma.cMSConnection.create({
      data: {
        id: uuid(),
        tenantId,
        provider: input.provider ?? 'notion',
        accessToken: input.accessToken,
        triggerDatabaseId: input.triggerDatabaseId ?? '',
        contentDatabaseId: input.contentDatabaseId,
        config: input.config ?? {},
      },
    });
  }

  async findAllActive() {
    return prisma.tenant.findMany({
      where: { isActive: true },
      include: { brandProfile: true, cmsConnections: true },
    });
  }
}
