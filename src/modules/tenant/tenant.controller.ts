import { Request, Response, NextFunction } from 'express';
import { TenantService } from './tenant.service';

export class TenantController {
  constructor(private service: TenantService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenant = await this.service.createTenant(req.body);
      res.status(201).json(tenant);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenant = await this.service.getTenant(req.params.id as string);
      res.json(tenant);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenant = await this.service.updateTenant(req.params.id as string, req.body);
      res.json(tenant);
    } catch (err) {
      next(err);
    }
  };

  upsertBrandProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await this.service.upsertBrandProfile(req.params.id as string, req.body);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  };

  createCMSConnection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const connection = await this.service.createCMSConnection(req.params.id as string, req.body);
      res.status(201).json(connection);
    } catch (err) {
      next(err);
    }
  };
}
