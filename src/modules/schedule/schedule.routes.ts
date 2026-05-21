import { Router } from 'express';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { ScheduleRepository } from './schedule.repository';
import { ContentRepository } from '../content/content.repository';
import { tenantResolver, validateRequest } from '../../common/middleware';
import {
  upsertScheduleConfigSchema,
  addScheduledPostsSchema,
  reorderPostSchema,
} from './schedule.validator';

const scheduleRepo = new ScheduleRepository();
const contentRepo = new ContentRepository();
const service = new ScheduleService(scheduleRepo, contentRepo);
const controller = new ScheduleController(service);

const router = Router();

router.use(tenantResolver);

// Schedule config
router.get('/config', controller.getConfig);
router.put('/config', validateRequest(upsertScheduleConfigSchema), controller.upsertConfig);

// Queue items
router.post('/posts', validateRequest(addScheduledPostsSchema), controller.addPosts);
router.get('/posts', controller.listPosts);
router.patch('/posts/:postId/reorder', validateRequest(reorderPostSchema), controller.reorderPost);
router.post('/posts/:postId/cancel', controller.cancelPost);
router.delete('/posts/:postId', controller.deletePost);

export { router as scheduleRoutes };
