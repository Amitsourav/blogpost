import { Router, Request, Response, NextFunction } from 'express';
import { notionPoller } from '../../providers/cms/notion/notion.poller';

const router = Router();

router.post('/notion/poll', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Manually trigger a poll cycle
    (notionPoller as any).poll();
    res.json({ message: 'Polling triggered' });
  } catch (err) {
    next(err);
  }
});

export { router as webhookRoutes };
