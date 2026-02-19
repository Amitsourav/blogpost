import { Router } from 'express';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { TenantRepository } from './tenant.repository';
import { validateRequest } from '../../common/middleware';
import {
  createTenantSchema,
  updateTenantSchema,
  upsertBrandProfileSchema,
  createCMSConnectionSchema,
} from './tenant.validator';

const repo = new TenantRepository();
const service = new TenantService(repo);
const controller = new TenantController(service);

const router = Router();

router.post('/', validateRequest(createTenantSchema), controller.create);
router.get('/by-slug/:slug', controller.getBySlug);
router.get('/:id', controller.getById);
router.patch('/:id', validateRequest(updateTenantSchema), controller.update);
router.put('/:id/brand-profile', validateRequest(upsertBrandProfileSchema), controller.upsertBrandProfile);
router.post('/:id/cms-connections', validateRequest(createCMSConnectionSchema), controller.createCMSConnection);

export { router as tenantRoutes };
