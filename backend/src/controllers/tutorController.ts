import type { Request, Response, NextFunction } from "express";
import { tutorService } from "../services/tutorService";
import { env } from "../config/config/env";

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";
}

export const tutorController = {
  async getResumeUploadIntent(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await tutorService.getResumeUploadIntent(req.body);
      res.status(201).json({ data });
    } catch (error) {
      next(error);
    }
  },

  async receiveResumeUpload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.storageToken) {
        return next(new Error("Missing storage token.")); // unreachable — verifyStorageTokenMiddleware runs first
      }
      if (!req.file) {
        return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No file was uploaded." } });
      }
      const data = await tutorService.receiveResumeUpload(req.storageToken.key, req.file.buffer);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },

  async getApplicationResumeUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const data = await tutorService.getApplicationResumeUrl(id, {
        actorUserId: req.user!.id,
        actorRole: req.user!.role,
      });
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },

  async getProfileResumeUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params as { userId: string };
      const data = await tutorService.getProfileResumeUrl(userId, {
        actorUserId: req.user!.id,
        actorRole: req.user!.role,
      });
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },

  async apply(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await tutorService.applyAsTutor(req.user!.id, req.body);
      return res.status(201).json({ message: "Application submitted successfully.", data });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return res.status(409).json({
          error: { code: "DUPLICATE_APPLICATION", message: "You already have a pending tutor application." },
        });
      }
      return next(error);
    }
  },

  async getMyApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await tutorService.getMyApplicationStatus(req.user!.id);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },

  async getTutorProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params as { userId: string };
      const data = await tutorService.getTutorProfile(userId);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },

  async updateMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await tutorService.updateTutorProfile(req.user!.id, req.body);
      res.status(200).json({ message: "Tutor profile updated.", data });
    } catch (error) {
      next(error);
    }
  },

  async requestBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params as { userId: string };
      const data = await tutorService.requestBooking(req.user!.id, userId, req.body);
      return res.status(201).json({ message: "Booking request sent.", data });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return res.status(409).json({
          error: { code: "DUPLICATE_BOOKING", message: "That time slot has already been requested with this tutor." },
        });
      }
      return next(error);
    }
  },

  async getBookingById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const data = await tutorService.getBookingById(req.user!.id, id);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },

  async listMyBookingsAsTutor(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await tutorService.listMyBookingsAsTutor(req.user!.id);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },

  async listMyBookingsAsStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await tutorService.listMyBookingsAsStudent(req.user!.id);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },

  async listMyStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await tutorService.listMyStudents(req.user!.id);
      res.status(200).json({ data });
    } catch (error) {
      next(error);
    }
  },

  async decideBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const { status } = req.body as { status: "accepted" | "declined" };
      const data = await tutorService.decideBooking(req.user!.id, id, status);
      res.status(200).json({ message: "Booking updated.", data });
    } catch (error) {
      next(error);
    }
  },

  async rescheduleBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const data = await tutorService.rescheduleBooking(req.user!.id, id, req.body);
      return res.status(200).json({ message: "Booking rescheduled.", data });
    } catch (error) {
      if (typeof error === "object" && error !== null && (error as { code?: string }).code === "23505") {
        return res.status(409).json({
          error: { code: "DUPLICATE_BOOKING", message: "That time slot has already been requested with this tutor." },
        });
      }
      return next(error);
    }
  },

  async getGoogleCalendarAuthUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const url = await tutorService.getGoogleCalendarAuthUrl(req.user!.id);
      res.status(200).json({ data: { url } });
    } catch (error) {
      next(error);
    }
  },

  /** Hit directly by Google's browser redirect — not an XHR, so it redirects back to the frontend rather than returning JSON. */
  async googleCalendarCallback(req: Request, res: Response) {
    const { state, code, error: oauthError } = req.query as unknown as {
      state?: string;
      code?: string;
      error?: string;
    };
    const frontendUrl = (path: string) => `${env.corsOrigins[0]}${path}`;
    if (oauthError || !state || !code) {
      return res.redirect(frontendUrl("/profile?section=tutor&calendar=error"));
    }
    try {
      await tutorService.handleGoogleCalendarCallback(state, code);
      return res.redirect(frontendUrl("/profile?section=tutor&calendar=connected"));
    } catch {
      return res.redirect(frontendUrl("/profile?section=tutor&calendar=error"));
    }
  },

  async disconnectGoogleCalendar(req: Request, res: Response, next: NextFunction) {
    try {
      await tutorService.disconnectGoogleCalendar(req.user!.id);
      res.status(200).json({ message: "Google Calendar disconnected." });
    } catch (error) {
      next(error);
    }
  },
};
