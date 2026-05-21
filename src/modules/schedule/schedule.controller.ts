import { Request, Response, NextFunction } from 'express';
import { ScheduleService } from './schedule.service';
import { ScheduledPostStatus } from '@prisma/client';

export class ScheduleController {
  constructor(private service: ScheduleService) {}

  getConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const config = await this.service.getConfig(req.tenant!.id);
      res.json(config || { isActive: false, postsPerDay: 1, timeOfDay: '10:00', timezone: 'Asia/Kolkata' });
    } catch (err) {
      next(err);
    }
  };

  upsertConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const config = await this.service.upsertConfig(req.tenant!.id, req.body);
      res.json(config);
    } catch (err) {
      next(err);
    }
  };

  addPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const posts = await this.service.addPosts(req.tenant!.id, req.body.posts);
      res.status(201).json({ posts, count: posts.length });
    } catch (err) {
      next(err);
    }
  };

  listPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '20', 10);
      const status = req.query.status as ScheduledPostStatus | undefined;
      const result = await this.service.listPosts(req.tenant!.id, page, limit, status);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  reorderPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const post = await this.service.reorderPostTo(req.params.postId as string, req.body.newPosition);
      res.json(post);
    } catch (err) {
      next(err);
    }
  };

  cancelPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const post = await this.service.cancelPost(req.params.postId as string);
      res.json(post);
    } catch (err) {
      next(err);
    }
  };

  deletePost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.deletePost(req.params.postId as string);
      res.json({ message: 'Post deleted' });
    } catch (err) {
      next(err);
    }
  };
}
