import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AppError } from '../errors';
import { TenantWithRelations } from '../types';

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantWithRelations;
    }
  }
}

export function tenantResolver(req: Request, _res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-tenant-key'] as string | undefined;

  if (!apiKey) {
    next(new AppError('Missing X-Tenant-Key header', 401));
    return;
  }

  prisma.tenant
    .findUnique({
      where: { apiKey },
      include: { brandProfile: true, cmsConnections: true },
    })
    .then((tenant) => {
      if (!tenant) {
        next(new AppError('Invalid API key', 401));
        return;
      }
      if (!tenant.isActive) {
        next(new AppError('Tenant is deactivated', 403));
        return;
      }
      req.tenant = tenant as TenantWithRelations;
      next();
    })
    .catch(next);
}
