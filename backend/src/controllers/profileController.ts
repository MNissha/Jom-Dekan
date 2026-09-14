import type { Request, Response, NextFunction } from 'express';
import { profileService } from '../services/profileService';
import type { UpdateProfileInput } from '../validators/userValidators';

export const profileController = {
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await profileService.getMyProfile(req.user!.id);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await profileService.updateMyProfile(req.user!.id, req.body as UpdateProfileInput);
      res.status(200).json({ message: 'Profile updated.', data });
    } catch (err) {
      next(err);
    }
  },

  async getMyStats(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await profileService.getMyStats(req.user!.id);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getMyActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await profileService.getMyActivity(req.user!.id);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getPublicProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await profileService.getPublicProfile(req.params.id);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },
};
