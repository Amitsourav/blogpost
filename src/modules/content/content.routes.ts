import { Router } from 'express';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { ContentRepository } from './content.repository';
import { tenantResolver, validateRequest } from '../../common/middleware';
import { generateContentSchema } from './content.validator';

const repo = new ContentRepository();
const service = new ContentService(repo);
const controller = new ContentController(service);

const router = Router();

router.use(tenantResolver);

router.post('/generate', validateRequest(generateContentSchema), controller.generate);
router.get('/tasks', controller.listTasks);
router.get('/tasks/:taskId', controller.getTask);
router.post('/tasks/:taskId/retry', controller.retryTask);

export { router as contentRoutes };
