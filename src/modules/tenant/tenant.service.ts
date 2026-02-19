import { TenantRepository } from './tenant.repository';
import { NotFoundError, ValidationError } from '../../common/errors';
import {
  CreateTenantInput,
  UpdateTenantInput,
  UpsertBrandProfileInput,
  CreateCMSConnectionInput,
} from '../../common/types';

export class TenantService {
  constructor(private repo: TenantRepository) {}

  async createTenant(input: CreateTenantInput) {
    const existing = await this.repo.findBySlug(input.slug);
    if (existing) {
      throw new ValidationError(`Tenant with slug "${input.slug}" already exists`);
    }
    return this.repo.create(input);
  }

  async getTenant(id: string) {
    const tenant = await this.repo.findById(id);
    if (!tenant) throw new NotFoundError('Tenant');
    return tenant;
  }

  async getTenantBySlug(slug: string) {
    const tenant = await this.repo.findBySlug(slug);
    if (!tenant) throw new NotFoundError('Tenant');
    return tenant;
  }

  async updateTenant(id: string, input: UpdateTenantInput) {
    await this.getTenant(id);
    return this.repo.update(id, input);
  }

  async upsertBrandProfile(tenantId: string, input: UpsertBrandProfileInput) {
    await this.getTenant(tenantId);
    return this.repo.upsertBrandProfile(tenantId, input);
  }

  async createCMSConnection(tenantId: string, input: CreateCMSConnectionInput) {
    await this.getTenant(tenantId);
    return this.repo.createCMSConnection(tenantId, input);
  }
}
