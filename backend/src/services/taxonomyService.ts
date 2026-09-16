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
import { logger } from "../utils/logger";

interface ActorContext {
  actorUserId: string;
  actorRole: "USER" | "ADMIN";
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

// Used by taxonomyService.requests.review() when an admin approves a
// combined request, and by resourceService's upload flow (self-serve
// immediate creation — see createOrReuseUniversity's export below) —
// creates the entity the caller asked for, or falls back to the
// existing one by slug if another request (or an admin) already created
// it in the meantime, so neither path ever fails just because of a race
// with itself.
export async function createOrReuseUniversity(
  name: string,
  ctx: ActorContext,
): Promise<string> {
  const slug = slugify(name);
  try {
    const row = await taxonomyModel.universities.create({
      name,
      slug,
      country: "Malaysia",
    });
    await auditLogModel.record({
      actorUserId: ctx.actorUserId,
      actorRole: ctx.actorRole,
      action: "TAXONOMY_UNIVERSITY_CREATED",
      targetType: "university",
      targetId: row.id,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });
    // This helper is shared with the admin-approval path (review()),
    // where an admin creating it *is* the review — only notify when a
    // regular user's self-serve action created it (universities.findOrCreate
    // / resourceService's resolveRequestedTaxonomy), same visibility a
    // community-submitted subject already gets, so it isn't only
    // discoverable by digging through the audit log.
    if (ctx.actorRole !== "ADMIN") {
      await notificationModel.notifyAdmins("TAXONOMY_UNIVERSITY_COMMUNITY_SUBMITTED", {
        message: `New university added: ${row.name} (not yet reviewed).`,
        universityId: row.id,
      });
      // Shows up in Admin > Taxonomy > Requests, same as a free-typed
      // request — reviewing it approves (just a sign-off, it's already
      // live) or rejects (deletes this exact row, see requests.review()).
      await taxonomyRequestModel.create({
        requestedBy: ctx.actorUserId,
        universityId: row.id,
        requestedUniversityName: row.name,
      });
    }
    return row.id;
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const existing = await taxonomyModel.universities.findBySlug(slug);
    if (!existing) throw err;
    return existing.id;
  }
}

export async function createOrReuseFaculty(
  universityId: string,
  name: string,
  ctx: ActorContext,
): Promise<string> {
  const slug = slugify(name);
  try {
    const row = await taxonomyModel.faculties.create({
      universityId,
      name,
      slug,
    });
    await auditLogModel.record({
      actorUserId: ctx.actorUserId,
      actorRole: ctx.actorRole,
      action: "TAXONOMY_FACULTY_CREATED",
      targetType: "faculty",
      targetId: row.id,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });
    if (ctx.actorRole !== "ADMIN") {
      await notificationModel.notifyAdmins("TAXONOMY_FACULTY_COMMUNITY_SUBMITTED", {
        message: `New faculty added: ${row.name} (not yet reviewed).`,
        facultyId: row.id,
        universityId,
      });
      await taxonomyRequestModel.create({
        requestedBy: ctx.actorUserId,
        universityId,
        facultyId: row.id,
        requestedFacultyName: row.name,
      });
    }
    return row.id;
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const existing = await taxonomyModel.faculties.findBySlug(
      universityId,
      slug,
    );
    if (!existing) throw err;
    return existing.id;
  }
}

export async function createOrReuseProgramme(
  facultyId: string,
  name: string,
  ctx: ActorContext,
): Promise<string> {
  const slug = slugify(name);
  try {
    const row = await taxonomyModel.programmes.create({
      facultyId,
      name,
      slug,
      studyLevel: null,
    });
    await auditLogModel.record({
      actorUserId: ctx.actorUserId,
      actorRole: ctx.actorRole,
      action: "TAXONOMY_PROGRAMME_CREATED",
      targetType: "programme",
      targetId: row.id,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });
    if (ctx.actorRole !== "ADMIN") {
      await notificationModel.notifyAdmins("TAXONOMY_PROGRAMME_COMMUNITY_SUBMITTED", {
        message: `New programme added: ${row.name} (not yet reviewed).`,
        programmeId: row.id,
        facultyId,
      });
      await taxonomyRequestModel.create({
        requestedBy: ctx.actorUserId,
        facultyId,
        programmeId: row.id,
        requestedProgrammeName: row.name,
      });
    }
    return row.id;
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const existing = await taxonomyModel.programmes.findBySlug(
      facultyId,
      slug,
    );
    if (!existing) throw err;
    return existing.id;
  }
}

// Mirrors taxonomyService.subjects.findOrCreateForProgramme, but marks
// the subject ADMIN_VERIFIED (an admin is the one approving this) and
// only links it to a programme when one was actually resolved — the
// request may have named a subject without the programme it belongs to
// existing yet either. universityId scopes the lookup/creation the same
// way it does everywhere else subjects are resolved (see migration 041).
async function createOrReuseSubject(
  code: string,
  name: string,
  programmeId: string | null,
  universityId: string | null,
  ctx: ActorContext,
): Promise<string> {
  const normalized = normalizeSubjectCode(code);
  let subject = normalized
    ? await taxonomyModel.subjects.findByCode(normalized, universityId)
    : null;
  if (!subject && normalized) {
    try {
      subject = await taxonomyModel.subjects.create({
        code: normalized,
        name,
        universityId,
        source: "ADMIN",
        verificationStatus: "ADMIN_VERIFIED",
      });
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        action: "TAXONOMY_SUBJECT_CREATED",
        targetType: "subject",
        targetId: subject.id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      subject = await taxonomyModel.subjects.findByCode(normalized, universityId);
    }
  }
  if (subject && programmeId) {
    await taxonomyModel.programmeSubjects.link({ programmeId, subjectId: subject.id });
  }
  return subject?.id ?? "";
}

export const taxonomyService = {
  universities: {
    async list() {
      const rows = await taxonomyModel.universities.list();
      return rows.map(toApiUniversity);
    },

    /**
     * Any-authenticated-user counterpart to `create` — same self-serve
     * idea as subjects.findOrCreateStandalone and resourceService's
     * resolveRequestedTaxonomy: naming a university that isn't in the
     * catalogue yet doesn't need to wait on ADMIN. Reuses
     * createOrReuseUniversity, the same helper the admin-approval path
     * uses, so a race between two callers naming the same university
     * resolves to one row either way.
     */
    async findOrCreate(input: { name: string }, ctx: ActorContext) {
      const existing = await taxonomyModel.universities.findBySlug(slugify(input.name));
      const id = await createOrReuseUniversity(input.name, ctx);
      const row = await taxonomyModel.universities.findById(id);
      if (!row) throw AppError.internal("University creation failed unexpectedly.");
      return { university: toApiUniversity(row), created: !existing };
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
        actorRole: ctx.actorRole,
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
        actorRole: ctx.actorRole,
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
        actorRole: ctx.actorRole,
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

    async remove(id: string, ctx: ActorContext) {
      const university = await taxonomyModel.universities.findById(id);
      if (!university) throw AppError.notFound("University not found.");
      const facultyCount = await taxonomyModel.universities.countFaculties(id);
      if (facultyCount > 0) {
        throw AppError.conflict(
          "This university still has faculties. Remove or reassign them first.",
        );
      }
      await taxonomyModel.universities.delete(id);
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        action: "TAXONOMY_UNIVERSITY_DELETED",
        targetType: "university",
        targetId: id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
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
        actorRole: ctx.actorRole,
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
        actorRole: ctx.actorRole,
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
        actorRole: ctx.actorRole,
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

    async remove(id: string, ctx: ActorContext) {
      const faculty = await taxonomyModel.faculties.findById(id);
      if (!faculty) throw AppError.notFound("Faculty not found.");
      const programmeCount = await taxonomyModel.faculties.countProgrammes(id);
      if (programmeCount > 0) {
        throw AppError.conflict(
          "This faculty still has programmes. Remove or reassign them first.",
        );
      }
      await taxonomyModel.faculties.delete(id);
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        action: "TAXONOMY_FACULTY_DELETED",
        targetType: "faculty",
        targetId: id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
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
        actorRole: ctx.actorRole,
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
        actorRole: ctx.actorRole,
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
        actorRole: ctx.actorRole,
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

    async remove(id: string, ctx: ActorContext) {
      const programme = await taxonomyModel.programmes.findById(id);
      if (!programme) throw AppError.notFound("Programme not found.");
      const dependentCount = await taxonomyModel.programmes.countDependents(id);
      if (dependentCount > 0) {
        throw AppError.conflict(
          "This programme still has linked subjects or resources. Remove them first.",
        );
      }
      await taxonomyModel.programmes.delete(id);
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        action: "TAXONOMY_PROGRAMME_DELETED",
        targetType: "programme",
        targetId: id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
    },
  },

  subjects: {
    async list(filters?: { universityId?: string; search?: string }) {
      const rows = await taxonomyModel.subjects.list(filters);
      return rows.map(toApiSubject);
    },

    async listByProgramme(programmeId: string) {
      const programme = await taxonomyModel.programmes.findById(programmeId);
      if (!programme) throw AppError.badRequest("Programme not found.");
      const rows = await taxonomyModel.subjects.listByProgramme(programmeId);
      return rows.map(toApiSubject);
    },

    async create(
      input: { code: string; name: string; universityId?: string },
      ctx: ActorContext,
    ) {
      const code = normalizeSubjectCode(input.code);
      if (!code) throw AppError.badRequest("Subject code is required.");
      const universityId = input.universityId ?? null;
      if (universityId) {
        const university = await taxonomyModel.universities.findById(universityId);
        if (!university) throw AppError.badRequest("University not found.");
      }
      let row;
      try {
        row = await taxonomyModel.subjects.create({ code, name: input.name, universityId });
      } catch (err) {
        if (isUniqueViolation(err))
          throw AppError.conflict(
            universityId
              ? "A subject with this code already exists for this university."
              : "A subject with this code already exists.",
          );
        throw err;
      }
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
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
        // The resource's own university, if the caller has one (resource
        // uploads always do). Optional so existing callers that don't
        // pass one keep working — the subject just stays scoped as
        // "legacy" (university_id NULL) in that case.
        universityId?: string;
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
      const universityId = input.universityId ?? null;

      let subject = await taxonomyModel.subjects.findByCode(code, universityId);
      let created = false;
      if (!subject) {
        try {
          subject = await taxonomyModel.subjects.create({
            code,
            name: input.name,
            universityId,
            source: "COMMUNITY",
            verificationStatus: "COMMUNITY_SUBMITTED",
            createdBy: ctx.actorUserId,
          });
          created = true;
        } catch (err) {
          if (!isUniqueViolation(err)) throw err;
          subject = await taxonomyModel.subjects.findByCode(code, universityId);
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
        actorRole: ctx.actorRole,
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
      if (created && ctx.actorRole !== "ADMIN") {
        await notificationModel.notifyAdmins("SUBJECT_COMMUNITY_SUBMITTED", {
          message: `New community subject: ${subject.code} - ${subject.name} (not yet admin-verified)`,
          subjectId: subject.id,
          programmeId: input.programmeId,
        });
        await taxonomyRequestModel.create({
          requestedBy: ctx.actorUserId,
          programmeId: input.programmeId,
          requestedSubjectCode: subject.code,
          requestedSubjectName: subject.name,
          subjectId: subject.id,
        });
      }

      return { subject: toApiSubject(subject), created };
    },

    /**
     * Same crowdsourcing idea as findOrCreateForProgramme, but for
     * contexts with no programme to attach to (e.g. the tutor application
     * form, which only asks which university a subject belongs to, not
     * a full programme/semester). Never blocks the caller on ADMIN
     * review — the subject is usable immediately as COMMUNITY_SUBMITTED.
     *
     * universityId is required and now genuinely persisted on the
     * subject (migration 041) — matching/dedup is scoped to it, so the
     * same code can mean a different subject at a different university.
     * Code is optional; when omitted, dedup falls back to
     * (university, normalized name) instead.
     */
    async findOrCreateStandalone(
      input: { code?: string; name: string; universityId: string },
      ctx: ActorContext,
    ) {
      if (!input.universityId) {
        throw AppError.badRequest("University is required.");
      }
      const university = await taxonomyModel.universities.findById(input.universityId);
      if (!university || !university.is_active) {
        throw AppError.badRequest("University not found or inactive.");
      }

      const code = input.code ? normalizeSubjectCode(input.code) : null;
      if (input.code && !code) throw AppError.badRequest("Subject code is invalid.");

      let subject = code
        ? await taxonomyModel.subjects.findByCode(code, input.universityId)
        : await taxonomyModel.subjects.findByNormalizedName(input.name, input.universityId);
      let created = false;
      if (!subject) {
        try {
          subject = await taxonomyModel.subjects.create({
            code,
            name: input.name,
            universityId: input.universityId,
            source: "COMMUNITY",
            verificationStatus: "COMMUNITY_SUBMITTED",
            createdBy: ctx.actorUserId,
          });
          created = true;
        } catch (err) {
          if (!isUniqueViolation(err)) throw err;
          subject = code
            ? await taxonomyModel.subjects.findByCode(code, input.universityId)
            : await taxonomyModel.subjects.findByNormalizedName(input.name, input.universityId);
          if (!subject) throw err;
        }
      }

      if (created) {
        await auditLogModel.record({
          actorUserId: ctx.actorUserId,
          actorRole: ctx.actorRole,
          action: "TAXONOMY_SUBJECT_COMMUNITY_SUBMITTED",
          targetType: "subject",
          targetId: subject.id,
          metadata: { universityId: input.universityId },
          requestId: ctx.requestId,
          ipAddress: ctx.ipAddress,
        });
        if (ctx.actorRole !== "ADMIN") {
          await notificationModel.notifyAdmins("SUBJECT_COMMUNITY_SUBMITTED", {
            message: `New community subject: ${subject.code ? `${subject.code} - ` : ""}${subject.name} (for ${university.name}, not yet admin-verified)`,
            subjectId: subject.id,
            universityId: input.universityId,
          });
          await taxonomyRequestModel.create({
            requestedBy: ctx.actorUserId,
            universityId: input.universityId,
            requestedSubjectCode: subject.code,
            requestedSubjectName: subject.name,
            subjectId: subject.id,
          });
        }
      }

      return { subject: toApiSubject(subject), created };
    },

    async update(id: string, input: { name: string }, ctx: ActorContext) {
      const row = await taxonomyModel.subjects.update(id, { name: input.name });
      if (!row) throw AppError.notFound("Subject not found.");
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
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
        actorRole: ctx.actorRole,
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

    async remove(id: string, ctx: ActorContext) {
      const subject = await taxonomyModel.subjects.findById(id);
      if (!subject) throw AppError.notFound("Subject not found.");
      const dependentCount = await taxonomyModel.subjects.countDependents(id);
      if (dependentCount > 0) {
        throw AppError.conflict(
          "This subject is still linked to a programme or resources. Remove them first.",
        );
      }
      await taxonomyModel.subjects.delete(id);
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        action: "TAXONOMY_SUBJECT_DELETED",
        targetType: "subject",
        targetId: id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
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
        actorRole: ctx.actorRole,
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
        actorRole: ctx.actorRole,
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
        actorRole: ctx.actorRole,
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

    async listPending() {
      const rows = await taxonomyRequestModel.listPending();
      return rows.map(toApiTaxonomyRequest);
    },

    async review(
      id: string,
      decision: "APPROVED" | "REJECTED",
      ctx: ActorContext,
    ) {
      const existing = await taxonomyRequestModel.findById(id);
      if (!existing) throw AppError.notFound("Taxonomy request not found.");
      if (existing.status !== "PENDING") {
        throw AppError.conflict("This request has already been reviewed.");
      }

      // Approving used to just flip the status — nothing the student
      // asked for ever actually showed up in the pickers. Now it stands
      // up whatever was free-typed (university -> faculty -> programme,
      // in that dependency order, each skipped if an existing id was
      // already given instead) so the resource-upload dropdowns have
      // something to select the moment the admin approves.
      let universityId = existing.university_id;
      let facultyId = existing.faculty_id;
      let programmeId = existing.programme_id;

      if (decision === "APPROVED") {
        if (!universityId && existing.requested_university_name) {
          universityId = await createOrReuseUniversity(
            existing.requested_university_name,
            ctx,
          );
        }
        if (!facultyId && existing.requested_faculty_name && universityId) {
          facultyId = await createOrReuseFaculty(
            universityId,
            existing.requested_faculty_name,
            ctx,
          );
        }
        if (!programmeId && existing.requested_programme_name && facultyId) {
          programmeId = await createOrReuseProgramme(
            facultyId,
            existing.requested_programme_name,
            ctx,
          );
        }
        // Skip when subject_id is already set — this request's subject
        // was already created for real by the self-serve flow that
        // filed it (see findOrCreateForProgramme/findOrCreateStandalone),
        // so there's nothing left to stand up; approving it here is just
        // a sign-off. Only the old-style, name-only request (no id yet)
        // needs createOrReuseSubject to actually create it.
        if (
          !existing.subject_id &&
          existing.requested_subject_code &&
          existing.requested_subject_name
        ) {
          await createOrReuseSubject(
            existing.requested_subject_code,
            existing.requested_subject_name,
            programmeId,
            universityId,
            ctx,
          );
        }
      }

      const row = await taxonomyRequestModel.review(id, {
        status: decision,
        reviewedBy: ctx.actorUserId,
        universityId,
        facultyId,
        programmeId,
      });
      if (!row) throw AppError.conflict("This request has already been reviewed.");

      if (decision === "REJECTED") {
        // Best-effort cleanup of whatever this specific request stood up
        // itself — both the real id AND the free-typed name are set,
        // never just a pre-existing entity the student merely
        // referenced. The rejection decision above is already
        // persisted, so a cleanup failure here (e.g. something else
        // started depending on it in the meantime) doesn't undo it —
        // the admin can finish removing it manually from the taxonomy
        // admin pages. Leaf-to-root order so a whole self-created chain
        // (university -> faculty -> programme) can actually clear.
        if (existing.subject_id) {
          await taxonomyService.subjects
            .remove(existing.subject_id, ctx)
            .catch((err) => logger.warn({ err, requestId: id }, "Could not delete rejected subject"));
        }
        if (existing.programme_id && existing.requested_programme_name) {
          await taxonomyService.programmes
            .remove(existing.programme_id, ctx)
            .catch((err) => logger.warn({ err, requestId: id }, "Could not delete rejected programme"));
        }
        if (existing.faculty_id && existing.requested_faculty_name) {
          await taxonomyService.faculties
            .remove(existing.faculty_id, ctx)
            .catch((err) => logger.warn({ err, requestId: id }, "Could not delete rejected faculty"));
        }
        if (existing.university_id && existing.requested_university_name) {
          await taxonomyService.universities
            .remove(existing.university_id, ctx)
            .catch((err) => logger.warn({ err, requestId: id }, "Could not delete rejected university"));
        }
      }

      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        action:
          decision === "APPROVED"
            ? "TAXONOMY_REQUEST_APPROVED"
            : "TAXONOMY_REQUEST_REJECTED",
        targetType: "taxonomy_request",
        targetId: row.id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });

      if (row.requested_by) {
        const missing = [
          row.requested_university_name &&
            `university "${row.requested_university_name}"`,
          row.requested_faculty_name && `faculty "${row.requested_faculty_name}"`,
          row.requested_programme_name &&
            `programme "${row.requested_programme_name}"`,
          row.requested_subject_name &&
            `subject "${row.requested_subject_code ? `${row.requested_subject_code} - ` : ""}${row.requested_subject_name}"`,
        ]
          .filter(Boolean)
          .join(", ");
        await notificationModel.notifyUser(
          row.requested_by,
          decision === "APPROVED"
            ? "TAXONOMY_REQUEST_APPROVED"
            : "TAXONOMY_REQUEST_REJECTED",
          {
            message:
              decision === "APPROVED"
                ? `Your request for ${missing} was approved.`
                : `Your request for ${missing} was rejected.`,
            taxonomyRequestId: row.id,
          },
        );
      }

      return toApiTaxonomyRequest(row);
    },
  },
};
