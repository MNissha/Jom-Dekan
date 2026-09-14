import {
  taxonomyModel,
  toApiUniversity,
  toApiFaculty,
  toApiProgramme,
  toApiSubject,
} from "../models/taxonomyModel";
import {
  taxonomyRequestModel,
  toApiTaxonomyRequest,
} from "../models/taxonomyRequestModel";
import { notificationModel } from "../models/notificationModel";
import { auditLogModel } from "../models/auditLogModel";
import { slugify } from "../utils/slug";
import { normalizeSubjectCode } from "../utils/subjectCode";
import { AppError } from "../types/errors";

interface ActorContext {
  actorUserId: string;
  requestId?: string;
  ipAddress?: string;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "23505"
  );
}

export const taxonomyService = {
  universities: {
    async list() {
      const rows = await taxonomyModel.universities.list();
      return rows.map(toApiUniversity);
    },

    async create(input: { name: string; country?: string }, ctx: ActorContext) {
      const slug = slugify(input.name);
      let row;
      try {
        row = await taxonomyModel.universities.create({
          name: input.name,
          slug,
          country: input.country ?? "Malaysia",
        });
      } catch (err) {
        if (isUniqueViolation(err))
          throw AppError.conflict(
            "A university with this name already exists.",
          );
        throw err;
      }
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        action: "TAXONOMY_UNIVERSITY_CREATED",
        targetType: "university",
        targetId: row.id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      return toApiUniversity(row);
    },

    async update(
      id: string,
      input: { name: string; country?: string },
      ctx: ActorContext,
    ) {
      const slug = slugify(input.name);
      let row;
      try {
        row = await taxonomyModel.universities.update(id, {
          name: input.name,
          slug,
          country: input.country ?? "Malaysia",
        });
      } catch (err) {
        if (isUniqueViolation(err))
          throw AppError.conflict(
            "A university with this name already exists.",
          );
        throw err;
      }
      if (!row) throw AppError.notFound("University not found.");
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        action: "TAXONOMY_UNIVERSITY_UPDATED",
        targetType: "university",
        targetId: row.id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      return toApiUniversity(row);
    },

    async setActive(id: string, isActive: boolean, ctx: ActorContext) {
      const row = await taxonomyModel.universities.setActive(id, isActive);
      if (!row) throw AppError.notFound("University not found.");
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        action: isActive
          ? "TAXONOMY_UNIVERSITY_RESTORED"
          : "TAXONOMY_UNIVERSITY_ARCHIVED",
        targetType: "university",
        targetId: row.id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      return toApiUniversity(row);
    },
  },

  faculties: {
    async listByUniversity(universityId: string) {
      const university =
        await taxonomyModel.universities.findById(universityId);
      if (!university) throw AppError.badRequest("University not found.");
      const rows = await taxonomyModel.faculties.listByUniversity(universityId);
      return rows.map(toApiFaculty);
    },

    async create(
      input: { universityId: string; name: string },
      ctx: ActorContext,
    ) {
      const university = await taxonomyModel.universities.findById(
        input.universityId,
      );
      if (!university || !university.is_active) {
        throw AppError.badRequest("University not found or inactive.");
      }
      const slug = slugify(input.name);
      let row;
      try {
        row = await taxonomyModel.faculties.create({
          universityId: input.universityId,
          name: input.name,
          slug,
        });
      } catch (err) {
        if (isUniqueViolation(err))
          throw AppError.conflict(
            "This faculty already exists for that university.",
          );
        throw err;
      }
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        action: "TAXONOMY_FACULTY_CREATED",
        targetType: "faculty",
        targetId: row.id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      return toApiFaculty(row);
    },

    async update(id: string, input: { name: string }, ctx: ActorContext) {
      const slug = slugify(input.name);
      let row;
      try {
        row = await taxonomyModel.faculties.update(id, {
          name: input.name,
          slug,
        });
      } catch (err) {
        if (isUniqueViolation(err))
          throw AppError.conflict(
            "This faculty already exists for that university.",
          );
        throw err;
      }
      if (!row) throw AppError.notFound("Faculty not found.");
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        action: "TAXONOMY_FACULTY_UPDATED",
        targetType: "faculty",
        targetId: row.id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      return toApiFaculty(row);
    },

    async setActive(id: string, isActive: boolean, ctx: ActorContext) {
      const row = await taxonomyModel.faculties.setActive(id, isActive);
      if (!row) throw AppError.notFound("Faculty not found.");
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        action: isActive
          ? "TAXONOMY_FACULTY_RESTORED"
          : "TAXONOMY_FACULTY_ARCHIVED",
        targetType: "faculty",
        targetId: row.id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      return toApiFaculty(row);
    },
  },

  programmes: {
    async listByFaculty(facultyId: string) {
      const rows = await taxonomyModel.programmes.listByFaculty(facultyId);
      return rows.map(toApiProgramme);
    },

    async create(
      input: { facultyId: string; name: string; studyLevel?: string },
      ctx: ActorContext,
    ) {
      const slug = slugify(input.name);
      let row;
      try {
        row = await taxonomyModel.programmes.create({
          facultyId: input.facultyId,
          name: input.name,
          slug,
          studyLevel: input.studyLevel ?? null,
        });
      } catch (err) {
        if (isUniqueViolation(err))
          throw AppError.conflict(
            "This programme already exists for that faculty.",
          );
        // A missing/invalid facultyId trips the foreign key, not the unique index.
        if (
          typeof err === "object" &&
          err !== null &&
          (err as { code?: string }).code === "23503"
        ) {
          throw AppError.badRequest("Faculty not found.");
        }
        throw err;
      }
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        action: "TAXONOMY_PROGRAMME_CREATED",
        targetType: "programme",
        targetId: row.id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      return toApiProgramme(row);
    },

    async update(
      id: string,
      input: { name: string; studyLevel?: string },
      ctx: ActorContext,
    ) {
      const slug = slugify(input.name);
      let row;
      try {
        row = await taxonomyModel.programmes.update(id, {
          name: input.name,
          slug,
          studyLevel: input.studyLevel ?? null,
        });
      } catch (err) {
        if (isUniqueViolation(err))
          throw AppError.conflict(
            "This programme already exists for that faculty.",
          );
        throw err;
      }
      if (!row) throw AppError.notFound("Programme not found.");
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        action: "TAXONOMY_PROGRAMME_UPDATED",
        targetType: "programme",
        targetId: row.id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      return toApiProgramme(row);
    },

    async setActive(id: string, isActive: boolean, ctx: ActorContext) {
      const row = await taxonomyModel.programmes.setActive(id, isActive);
      if (!row) throw AppError.notFound("Programme not found.");
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        action: isActive
          ? "TAXONOMY_PROGRAMME_RESTORED"
          : "TAXONOMY_PROGRAMME_ARCHIVED",
        targetType: "programme",
        targetId: row.id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      return toApiProgramme(row);
    },
  },

  subjects: {
    async list() {
      const rows = await taxonomyModel.subjects.list();
      return rows.map(toApiSubject);
    },

    async listByProgramme(programmeId: string) {
      const programme = await taxonomyModel.programmes.findById(programmeId);
      if (!programme) throw AppError.badRequest("Programme not found.");
      const rows = await taxonomyModel.subjects.listByProgramme(programmeId);
      return rows.map(toApiSubject);
    },

    async create(input: { code: string; name: string }, ctx: ActorContext) {
      const code = normalizeSubjectCode(input.code);
      if (!code) throw AppError.badRequest("Subject code is required.");
      let row;
      try {
        row = await taxonomyModel.subjects.create({ code, name: input.name });
      } catch (err) {
        if (isUniqueViolation(err))
          throw AppError.conflict("A subject with this code already exists.");
        throw err;
      }
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        action: "TAXONOMY_SUBJECT_CREATED",
        targetType: "subject",
        targetId: row.id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      return toApiSubject(row);
    },

    /**
     * The student-facing counterpart to `create`: given a programme and a
     * free-typed code/name, reuse an existing subject if one already
     * matches the normalized code (linking it to this programme if it
     * wasn't already), or create a new COMMUNITY_SUBMITTED subject when
     * none does. Never requires ADMIN — this is what lets the first
     * student uploading for a subject stand it up on the spot instead of
     * waiting on an admin, per the crowdsourcing design in the product
     * doc. A duplicate-code race (two students submitting the same new
     * subject at once) is resolved by re-fetching on the unique-violation
     * error rather than failing the upload.
     */
    async findOrCreateForProgramme(
      input: {
        programmeId: string;
        code: string;
        name: string;
        curriculumYear?: number;
        recommendedSemester?: number;
      },
      ctx: ActorContext,
    ) {
      const programme = await taxonomyModel.programmes.findById(
        input.programmeId,
      );
      if (!programme || !programme.is_active) {
        throw AppError.badRequest("Programme not found or inactive.");
      }
      const code = normalizeSubjectCode(input.code);
      if (!code) throw AppError.badRequest("Subject code is required.");

      let subject = await taxonomyModel.subjects.findByCode(code);
      let created = false;
      if (!subject) {
        try {
          subject = await taxonomyModel.subjects.create({
            code,
            name: input.name,
            source: "COMMUNITY",
            verificationStatus: "COMMUNITY_SUBMITTED",
            createdBy: ctx.actorUserId,
          });
          created = true;
        } catch (err) {
          if (!isUniqueViolation(err)) throw err;
          subject = await taxonomyModel.subjects.findByCode(code);
          if (!subject) throw err;
        }
      }

      await taxonomyModel.programmeSubjects.link({
        programmeId: input.programmeId,
        subjectId: subject.id,
        curriculumYear: input.curriculumYear,
        recommendedSemester: input.recommendedSemester,
      });
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        action: created
          ? "TAXONOMY_SUBJECT_COMMUNITY_SUBMITTED"
          : "TAXONOMY_SUBJECT_REUSED_FOR_PROGRAMME",
        targetType: "subject",
        targetId: subject.id,
        metadata: {
          programmeId: input.programmeId,
          curriculumYear: input.curriculumYear,
          recommendedSemester: input.recommendedSemester,
        },
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });

      // Never blocks the upload — the subject already exists by this
      // point. This just gives admins visibility into new
      // COMMUNITY_SUBMITTED subjects so they can review/merge/clean them
      // up later; there is no approval gate here.
      if (created) {
        await notificationModel.notifyAdmins("SUBJECT_COMMUNITY_SUBMITTED", {
          message: `New community subject: ${subject.code} - ${subject.name} (not yet admin-verified)`,
          subjectId: subject.id,
          programmeId: input.programmeId,
        });
      }

      return { subject: toApiSubject(subject), created };
    },

    async update(id: string, input: { name: string }, ctx: ActorContext) {
      const row = await taxonomyModel.subjects.update(id, { name: input.name });
      if (!row) throw AppError.notFound("Subject not found.");
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        action: "TAXONOMY_SUBJECT_UPDATED",
        targetType: "subject",
        targetId: row.id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      return toApiSubject(row);
    },

    async setActive(id: string, isActive: boolean, ctx: ActorContext) {
      const row = await taxonomyModel.subjects.setActive(id, isActive);
      if (!row) throw AppError.notFound("Subject not found.");
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        action: isActive
          ? "TAXONOMY_SUBJECT_RESTORED"
          : "TAXONOMY_SUBJECT_ARCHIVED",
        targetType: "subject",
        targetId: row.id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      return toApiSubject(row);
    },
  },

  programmeSubjects: {
    async link(
      input: {
        programmeId: string;
        subjectId: string;
        curriculumYear?: number;
        recommendedYear?: number;
        recommendedSemester?: number;
      },
      ctx: ActorContext,
    ) {
      const programme = await taxonomyModel.programmes.findById(
        input.programmeId,
      );
      if (!programme) throw AppError.badRequest("Programme not found.");
      const subject = await taxonomyModel.subjects.findById(input.subjectId);
      if (!subject) throw AppError.badRequest("Subject not found.");

      await taxonomyModel.programmeSubjects.link(input);
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        action: "TAXONOMY_PROGRAMME_SUBJECT_LINKED",
        targetType: "programme",
        targetId: input.programmeId,
        metadata: { subjectId: input.subjectId },
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      const rows = await taxonomyModel.subjects.listByProgramme(
        input.programmeId,
      );
      return rows.map(toApiSubject);
    },

    async unlink(
      programmeId: string,
      subjectId: string,
      ctx: ActorContext,
    ) {
      const removed = await taxonomyModel.programmeSubjects.unlink(
        programmeId,
        subjectId,
      );
      if (!removed) throw AppError.notFound("That subject isn't linked to this programme.");
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        action: "TAXONOMY_PROGRAMME_SUBJECT_UNLINKED",
        targetType: "programme",
        targetId: programmeId,
        metadata: { subjectId },
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      const rows = await taxonomyModel.subjects.listByProgramme(programmeId);
      return rows.map(toApiSubject);
    },
  },

  /**
   * The "can't find your university/faculty/programme? request it"
   * path — any authenticated user, no approval gate on submission
   * itself (the gate is an admin reviewing the request afterward, which
   * is out of scope for this change; see Migration 023). Unlike
   * subjects.findOrCreateForProgramme, this never creates the row on the
   * spot: universities/programmes still require ADMIN today, so all this
   * does is record the request and notify admins.
   */
  requests: {
    async create(
      input: {
        universityId?: string;
        requestedUniversityName?: string;
        facultyId?: string;
        requestedFacultyName?: string;
        programmeId?: string;
        requestedProgrammeName?: string;
        requestedSubjectCode?: string;
        requestedSubjectName?: string;
        note?: string;
      },
      ctx: ActorContext,
    ) {
      if (input.universityId) {
        const university = await taxonomyModel.universities.findById(
          input.universityId,
        );
        if (!university) throw AppError.badRequest("University not found.");
      }
      if (input.facultyId) {
        const faculty = await taxonomyModel.faculties.findById(
          input.facultyId,
        );
        if (!faculty) throw AppError.badRequest("Faculty not found.");
      }
      if (input.programmeId) {
        const programme = await taxonomyModel.programmes.findById(
          input.programmeId,
        );
        if (!programme) throw AppError.badRequest("Programme not found.");
      }

      const row = await taxonomyRequestModel.create({
        requestedBy: ctx.actorUserId,
        universityId: input.universityId,
        requestedUniversityName: input.requestedUniversityName,
        facultyId: input.facultyId,
        requestedFacultyName: input.requestedFacultyName,
        programmeId: input.programmeId,
        requestedProgrammeName: input.requestedProgrammeName,
        requestedSubjectCode: input.requestedSubjectCode,
        requestedSubjectName: input.requestedSubjectName,
        note: input.note,
      });

      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        action: "TAXONOMY_REQUEST_SUBMITTED",
        targetType: "taxonomy_request",
        targetId: row.id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });

      const missing = [
        input.requestedUniversityName && `university "${input.requestedUniversityName}"`,
        input.requestedFacultyName && `faculty "${input.requestedFacultyName}"`,
        input.requestedProgrammeName && `programme "${input.requestedProgrammeName}"`,
        input.requestedSubjectCode &&
          `subject "${input.requestedSubjectCode} - ${input.requestedSubjectName}"`,
      ]
        .filter(Boolean)
        .join(", ");
      await notificationModel.notifyAdmins("TAXONOMY_REQUEST_SUBMITTED", {
        message: `New taxonomy request: ${missing}.${input.note ? ` Note: ${input.note}` : ""}`,
        taxonomyRequestId: row.id,
      });

      return toApiTaxonomyRequest(row);
    },

    async listMine(ctx: ActorContext) {
      const rows = await taxonomyRequestModel.listByRequester(
        ctx.actorUserId,
      );
      return rows.map(toApiTaxonomyRequest);
    },
  },
};
