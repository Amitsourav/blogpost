import { Request, Response, NextFunction } from 'express';
import { ContentService } from './content.service';
import { ContentTaskStatus } from '@prisma/client';

export class ContentController {
  constructor(private service: ContentService) {}

  generate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { topic, keywords } = req.body;
      const task = await this.service.generateContent(req.tenant!.id, topic, keywords);
      res.status(202).json({
        message: 'Content generation started',
        taskId: task.id,
        status: task.status,
      });
    } catch (err) {
      next(err);
    }
  };

  listTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '20', 10);
      const status = req.query.status as ContentTaskStatus | undefined;
      const result = await this.service.listTasks(req.tenant!.id, page, limit, status);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  getTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const task = await this.service.getTask(req.params.taskId as string);
      res.json(task);
    } catch (err) {
      next(err);
    }
  };

  retryTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const task = await this.service.retryTask(req.params.taskId as string);
      res.json({ message: 'Task retry initiated', taskId: task.id, status: task.status });
    } catch (err) {
      next(err);
    }
  };
}
