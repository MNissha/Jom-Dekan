import { profileModel, toApiProfile, toApiPublicProfile, toApiStats, toApiActivity } from '../models/profileModel';
import { taxonomyModel } from '../models/taxonomyModel';
import { userModel } from '../models/userModel';
import { authService } from './authService';
import { AppError } from '../types/errors';
import { logger } from '../utils/logger';

export const profileService = {
  async getMyProfile(userId: string) {
    const profile = await profileModel.findByUserId(userId);
    if (!profile) {
      throw AppError.notFound('Profile not found.');
    }
    return toApiProfile(profile);
  },

  async updateMyProfile(
    userId: string,
    fields: Partial<{
      displayName: string;
      phone: string;
      email: string;
      academicRole: 'STUDENT' | 'TUTOR';
      universityId: string;
      fieldOfStudy: string;
      currentYear: number;
      currentSemester: number;
    }>,
  ) {
    if (fields.universityId) {
      const university = await taxonomyModel.universities.findById(fields.universityId);
      if (!university || !university.is_active) {
        throw AppError.badRequest('Select a valid university.');
      }
    }

    if (fields.email) {
      const normalizedEmail = fields.email.trim().toLowerCase();
      const currentUser = await userModel.findById(userId);
      if (!currentUser) throw AppError.notFound('Profile not found.');

      if (normalizedEmail !== currentUser.email.toLowerCase()) {
        const existing = await userModel.findByEmail(normalizedEmail);
        if (existing && existing.id !== userId) {
          throw AppError.conflict('This email is already registered to another account.');
        }

        const updatedUser = await userModel.updateEmail(userId, normalizedEmail);
        try {
          // Same token model + email template used at registration — the
          // new address must be re-confirmed via that existing flow
          // (/auth/verify-email), unchanged.
          await authService.sendVerificationEmail(updatedUser);
        } catch (err) {
          logger.warn({ userId, err }, 'Failed to send verification email after email change');
        }
      }
    }

    const profile = await profileModel.update(userId, {
      displayName: fields.displayName,
      phone: fields.phone,
      academicRole: fields.academicRole,
      universityId: fields.universityId,
      fieldOfStudy: fields.fieldOfStudy,
      currentYear: fields.currentYear,
      currentSemester: fields.currentSemester,
    });
    if (!profile) {
      throw AppError.notFound('Profile not found.');
    }
    return toApiProfile(profile);
  },

  async getPublicProfile(userId: string) {
    const profile = await profileModel.findByUserId(userId);
    if (!profile) {
      throw AppError.notFound('User not found.');
    }
    return toApiPublicProfile(profile);
  },

  async getMyStats(userId: string) {
    const stats = await profileModel.getStats(userId);
    return toApiStats(stats);
  },

  async getMyActivity(userId: string, limit = 8) {
    const rows = await profileModel.getRecentActivity(userId, limit);
    return rows.map(toApiActivity);
  },
};
