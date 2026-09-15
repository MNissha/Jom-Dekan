import { randomUUID, createHash } from "crypto";
import {
  resourceModel,
  toApiResource,
  toApiResourceFile,
  toApiResourceListItem,
  type ResourceCategory,
  type ResourceRow,
  type ResourceSortBy,
} from "../models/resourceModel";
import { auditLogModel } from "../models/auditLogModel";
import { favoriteModel } from "../models/favoriteModel";
import { getStorageAdapter } from "../config/config/storage";
import { detectFileType, isAllowedMimeType } from "../utils/fileSniffer";
import {
  resolveStoragePath,
  sanitizeFilenameForHeader,
} from "../utils/storagePaths";
import { env } from "../config/config/env";
import { AppError } from "../types/errors";
import { taxonomyModel } from "../models/taxonomyModel";
import { taxonomyService } from "./taxonomyService";

interface ActorContext {
  actorUserId: string;
  actorRole: "USER" | "ADMIN";
  requestId?: string;
  ipAddress?: string;
}

/**
 * The first ownership-check precedent in this codebase (taxonomy is
 * role-only via `authorize('ADMIN')`). Two-gate rule, applied
 * identically everywhere a resource/file is looked up:
 *
 *   1. Visibility — is this resource visible to the requester at all?
 *      Fails -> 404 (never reveal that someone else's non-public
 *      resource exists).
 *   2. Ownership — only reached once visible. Fails -> 403.
 */
function isVisible(resource: ResourceRow, ctx: ActorContext): boolean {
  return (
    resource.status === "READY" ||
    ctx.actorRole === "ADMIN" ||
    resource.owner_id === ctx.actorUserId
  );
}

function isOwnerOrAdmin(resource: ResourceRow, ctx: ActorContext): boolean {
  return resource.owner_id === ctx.actorUserId || ctx.actorRole === "ADMIN";
}

async function getVisibleOrThrow(
  id: string,
  ctx: ActorContext,
): Promise<ResourceRow> {
  const resource = await resourceModel.findById(id);
  if (!resource || !isVisible(resource, ctx)) {
    throw AppError.notFound("Resource not found.");
  }
  return resource;
}

async function validateTaxonomy(input: {
  universityId?: string;
  facultyId?: string;
  programmeId?: string;
  subjectId?: string;
}) {
  const university = input.universityId
    ? await taxonomyModel.universities.findById(input.universityId)
    : null;
  const faculty = input.facultyId
    ? await taxonomyModel.faculties.findById(input.facultyId)
    : null;
  const programme = input.programmeId
    ? await taxonomyModel.programmes.findById(input.programmeId)
    : null;
  const subject = input.subjectId
    ? await taxonomyModel.subjects.findById(input.subjectId)
    : null;

  if (input.universityId && (!university || !university.is_active)) {
    throw AppError.badRequest("The selected university is not available.");
  }
  if (input.facultyId && (!faculty || !faculty.is_active)) {
    throw AppError.badRequest("The selected faculty is not available.");
  }
  if (input.programmeId && (!programme || !programme.is_active)) {
    throw AppError.badRequest("The selected programme is not available.");
  }
  if (input.subjectId && (!subject || !subject.is_active)) {
    throw AppError.badRequest("The selected subject is not available.");
  }
  if (
    faculty &&
    input.universityId &&
    faculty.university_id !== input.universityId
  ) {
    throw AppError.badRequest(
      "The faculty does not belong to the selected university.",
    );
  }
  if (programme && faculty && programme.faculty_id !== faculty.id) {
    throw AppError.badRequest(
      "The programme does not belong to the selected faculty.",
    );
  }
}

/**
 * Stub seam for a future real antivirus/content-scan integration.
 * Always resolves 'clean' today — this is deliberately named and
 * isolated so a real scanner is a one-function swap, not a rewrite of
 * the confirm flow around it.
 */
async function scanStub(_buffer: Buffer): Promise<"clean" | "flagged"> {
  return "clean";
}

// Caps how many files a multi-file upload can pile onto a single
// resource — generous enough for a real batch of scanned pages/slides,
// small enough that it can't be used to spam unbounded rows onto one row.
const MAX_FILES_PER_RESOURCE = 10;

export const resourceService = {
  async createUploadIntent(
    input: {
      title: string;
      description?: string;
      category: ResourceCategory;
      universityId?: string;
      facultyId?: string;
      programmeId?: string;
      subjectId?: string;
      subjectCode?: string;
      subjectName?: string;
      subjectCurriculumYear?: number;
      subjectSemester?: number;
      // Present for the 2nd+ file of a multi-file upload — see
      // createUploadIntentSchema.
      resourceId?: string;
      fileName: string;
      contentType: string;
      sizeBytes: number;
    },
    ctx: ActorContext,
  ) {
    if (!isAllowedMimeType(input.contentType)) {
      throw AppError.badRequest(
        "Unsupported file type. Allowed: PDF, JPEG, PNG, DOCX, XLSX, PPTX.",
      );
    }
    if (input.sizeBytes > env.resources.maxFileSizeBytes) {
      throw AppError.badRequest(
        `File is too large. Maximum size is ${Math.floor(env.resources.maxFileSizeBytes / (1024 * 1024))}MB.`,
      );
    }

    let resource: ResourceRow;
    if (input.resourceId) {
      // Attaching another file to a resource created earlier in the same
      // multi-file upload — the taxonomy/subject fields above only apply
      // when standing up a brand-new resource, so they're ignored here.
      resource = await getVisibleOrThrow(input.resourceId, ctx);
      if (!isOwnerOrAdmin(resource, ctx)) throw AppError.forbidden();
      if (resource.status === "ARCHIVED") {
        throw AppError.badRequest("Can't add files to an archived resource.");
      }
      const existingFiles = await resourceModel.files.findByResourceId(resource.id);
      if (existingFiles.length >= MAX_FILES_PER_RESOURCE) {
        throw AppError.badRequest(
          `A resource can have at most ${MAX_FILES_PER_RESOURCE} files.`,
        );
      }
    } else {
      await validateTaxonomy(input);

      // A student typed a subject that isn't in the catalogue yet — stand
      // it up (or reuse a matching one) before the resource row exists, so
      // the resource is never left pointing at a subjectId that doesn't
      // exist yet.
      let subjectId = input.subjectId ?? null;
      if (!subjectId && input.subjectCode) {
        const { subject } = await taxonomyService.subjects.findOrCreateForProgramme(
          {
            programmeId: input.programmeId!,
            code: input.subjectCode,
            name: input.subjectName!,
            curriculumYear: input.subjectCurriculumYear,
            recommendedSemester: input.subjectSemester,
          },
          {
            actorUserId: ctx.actorUserId,
            actorRole: ctx.actorRole,
            requestId: ctx.requestId,
            ipAddress: ctx.ipAddress,
          },
        );
        subjectId = subject.id;
      }

      resource = await resourceModel.create({
        ownerId: ctx.actorUserId,
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        universityId: input.universityId ?? null,
        facultyId: input.facultyId ?? null,
        programmeId: input.programmeId ?? null,
        subjectId,
      });
    }

    const storageKey = randomUUID();
    const file = await resourceModel.files.create({
      resourceId: resource.id,
      storageKey,
      originalFilename: input.fileName,
      declaredMimeType: input.contentType,
      sizeBytes: input.sizeBytes,
    });

    const { uploadUrl } = await getStorageAdapter().createUploadIntent(
      storageKey,
      input.contentType,
    );

    await auditLogModel.record({
      actorUserId: ctx.actorUserId,
      actorRole: ctx.actorRole,
      action: input.resourceId ? "RESOURCE_FILE_ADDED" : "RESOURCE_CREATED",
      targetType: input.resourceId ? "resource_file" : "resource",
      targetId: input.resourceId ? file.id : resource.id,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });

    return {
      resource: toApiResource(resource),
      file: toApiResourceFile(file),
      uploadUrl,
    };
  },

  /**
   * A resource with no file at all — the description text IS the
   * content. Skips the whole upload/scan pipeline entirely (there are
   * no bytes to scan) and goes straight to READY, unlike the file path
   * above where READY is only reached after confirmUpload's scan-stub.
   */
  async createTextResource(
    input: {
      title: string;
      description: string;
      category: ResourceCategory;
      universityId?: string;
      facultyId?: string;
      programmeId?: string;
      subjectId?: string;
    },
    ctx: ActorContext,
  ) {
    await validateTaxonomy(input);

    const resource = await resourceModel.create({
      ownerId: ctx.actorUserId,
      title: input.title,
      description: input.description,
      category: input.category,
      universityId: input.universityId ?? null,
      facultyId: input.facultyId ?? null,
      programmeId: input.programmeId ?? null,
      subjectId: input.subjectId ?? null,
    });

    const readyResource = await resourceModel.setStatus(resource.id, "READY");

    await auditLogModel.record({
      actorUserId: ctx.actorUserId,
      actorRole: ctx.actorRole,
      action: "RESOURCE_CREATED",
      targetType: "resource",
      targetId: resource.id,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });
    await auditLogModel.record({
      actorUserId: ctx.actorUserId,
      actorRole: ctx.actorRole,
      action: "RESOURCE_READY",
      targetType: "resource",
      targetId: resource.id,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });

    return { resource: toApiResource(readyResource!) };
  },

  /**
   * Handles the token-gated PUT — receives the raw file buffer already
   * validated for size by multer's `limits.fileSize`. Order matters:
   * detect the real type from bytes BEFORE writing anything to disk,
   * and only claim the DB row (atomic, one-shot) after that check
   * passes, so a rejected upload never leaves a partial/inconsistent
   * UPLOADED row behind.
   */
  async receiveUpload(storageKey: string, buffer: Buffer) {
    const detected = detectFileType(buffer);
    if (!detected) {
      throw AppError.badRequest(
        "The uploaded file does not match any supported file type (PDF, JPEG, PNG, DOCX, XLSX, PPTX).",
      );
    }

    const checksum = createHash("sha256").update(buffer).digest("hex");
    const file = await resourceModel.files.claimForUpload(storageKey, {
      detectedMimeType: detected,
      checksumSha256: checksum,
    });
    if (!file) {
      throw AppError.conflict(
        "This upload link has already been used or is no longer valid.",
      );
    }

    if (file.declared_mime_type !== detected) {
      await resourceModel.files.markFailed(file.id);
      throw AppError.badRequest(
        "The file content does not match the declared file type. This upload has been rejected.",
      );
    }

    await getStorageAdapter().putObject(
      storageKey,
      buffer,
      file.detected_mime_type ?? file.declared_mime_type,
    );
    return toApiResourceFile(file);
  },

  async confirmUpload(fileId: string, ctx: ActorContext) {
    const file = await resourceModel.files.findById(fileId);
    if (!file) throw AppError.notFound("File not found.");

    const resource = await getVisibleOrThrow(file.resource_id, ctx);
    if (!isOwnerOrAdmin(resource, ctx)) throw AppError.forbidden();

    if (file.status !== "UPLOADED") {
      throw AppError.conflict("This file has not finished uploading yet.");
    }

    const buffer = await getStorageAdapter().getObject(file.storage_key);
    const scanResult = await scanStub(buffer);

    const updatedFile =
      scanResult === "clean"
        ? await resourceModel.files.markReady(fileId)
        : await resourceModel.files.markFailed(fileId);

    await auditLogModel.record({
      actorUserId: ctx.actorUserId,
      actorRole: ctx.actorRole,
      action: "RESOURCE_FILE_CONFIRMED",
      targetType: "resource_file",
      targetId: fileId,
      metadata: { scanResult },
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });

    const newResourceStatus = scanResult === "clean" ? "READY" : "FAILED";
    const updatedResource = await resourceModel.setStatus(
      resource.id,
      newResourceStatus,
    );
    await auditLogModel.record({
      actorUserId: ctx.actorUserId,
      actorRole: ctx.actorRole,
      action:
        newResourceStatus === "READY" ? "RESOURCE_READY" : "RESOURCE_FAILED",
      targetType: "resource",
      targetId: resource.id,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });

    return {
      resource: toApiResource(updatedResource!),
      file: toApiResourceFile(updatedFile!),
    };
  },

  /**
   * Reuses the same visibility gate as every other resource read, for
   * services that need the raw row (not the API-shaped one) — currently
   * only resourceSummaryService, which also needs `owner_id`/`status`
   * directly rather than the trimmed API shape `getById` returns.
   */
  async getVisibleResource(id: string, ctx: ActorContext): Promise<ResourceRow> {
    return getVisibleOrThrow(id, ctx);
  },

  async getById(id: string, ctx: ActorContext) {
    await getVisibleOrThrow(id, ctx);
    const [withOwner, files] = await Promise.all([
      resourceModel.findByIdWithOwner(id),
      resourceModel.files.findByResourceId(id),
    ]);
    return {
      resource: toApiResourceListItem(withOwner!),
      files: files.map(toApiResourceFile),
    };
  },

  async list(
    filters: {
      mine?: boolean;
      universityId?: string;
      facultyId?: string;
      programmeId?: string;
      subjectId?: string;
      category?: ResourceCategory;
      q?: string;
      sortBy: ResourceSortBy;
      page: number;
      pageSize: number;
    },
    ctx: ActorContext,
  ) {
    const limit = filters.pageSize;
    const offset = (filters.page - 1) * filters.pageSize;

    const { rows, total } = await resourceModel.list({
      status: filters.mine ? undefined : "READY",
      ownerId: filters.mine ? ctx.actorUserId : undefined,
      universityId: filters.universityId,
      facultyId: filters.facultyId,
      programmeId: filters.programmeId,
      subjectId: filters.subjectId,
      category: filters.category,
      q: filters.q,
      sortBy: filters.sortBy,
      limit,
      offset,
    });

    return {
      data: rows.map(toApiResourceListItem),
      meta: { page: filters.page, pageSize: filters.pageSize, total },
    };
  },

  async update(
    id: string,
    input: {
      title: string;
      description?: string;
      universityId?: string;
      facultyId?: string;
      programmeId?: string;
      subjectId?: string;
    },
    ctx: ActorContext,
  ) {
    const resource = await getVisibleOrThrow(id, ctx);
    if (!isOwnerOrAdmin(resource, ctx)) throw AppError.forbidden();

    await validateTaxonomy(input);

    const updated = await resourceModel.update(id, {
      title: input.title,
      description: input.description ?? null,
      universityId: input.universityId ?? null,
      facultyId: input.facultyId ?? null,
      programmeId: input.programmeId ?? null,
      subjectId: input.subjectId ?? null,
    });
    if (!updated) throw AppError.notFound("Resource not found.");

    await auditLogModel.record({
      actorUserId: ctx.actorUserId,
      actorRole: ctx.actorRole,
      action: "RESOURCE_UPDATED",
      targetType: "resource",
      targetId: id,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });
    return toApiResource(updated);
  },

  async setStatus(
    id: string,
    action: "ARCHIVE" | "RESTORE",
    ctx: ActorContext,
  ) {
    const resource = await getVisibleOrThrow(id, ctx);
    if (!isOwnerOrAdmin(resource, ctx)) throw AppError.forbidden();

    const nextStatus = action === "ARCHIVE" ? "ARCHIVED" : "READY";
    const updated = await resourceModel.setStatus(id, nextStatus);
    if (!updated) throw AppError.notFound("Resource not found.");

    await auditLogModel.record({
      actorUserId: ctx.actorUserId,
      actorRole: ctx.actorRole,
      action: action === "ARCHIVE" ? "RESOURCE_ARCHIVED" : "RESOURCE_RESTORED",
      targetType: "resource",
      targetId: id,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });
    return toApiResource(updated);
  },

  /**
   * Real, irreversible delete — the one deliberate exception to this
   * app's archive-only convention elsewhere (taxonomy, and setStatus
   * above), added on top of Archive at the user's explicit request.
   * `resource_files` rows cascade automatically; the physical files on
   * disk don't, so those are cleaned up here, best-effort — a stray
   * orphaned file on disk is a much smaller problem than failing the
   * whole delete because one unlink hit a transient error.
   */
  async remove(id: string, ctx: ActorContext) {
    const resource = await getVisibleOrThrow(id, ctx);
    if (!isOwnerOrAdmin(resource, ctx)) throw AppError.forbidden();

    const files = await resourceModel.files.findByResourceId(id);
    const removed = await resourceModel.remove(id);
    if (!removed) throw AppError.notFound("Resource not found.");

    await Promise.all(
      files.map((file) => getStorageAdapter().deleteObject(file.storage_key)),
    );
    // No DB-level cascade for this anymore (favorites.target_id carries
    // no FK — see migration 014), so it's cleaned up explicitly here,
    // same best-effort spirit as the storage file cleanup above.
    await favoriteModel.removeAllForTarget("resource", id);

    await auditLogModel.record({
      actorUserId: ctx.actorUserId,
      actorRole: ctx.actorRole,
      action: "RESOURCE_DELETED",
      targetType: "resource",
      targetId: id,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });
  },

  async getDownloadUrl(fileId: string, ctx: ActorContext) {
    const file = await resourceModel.files.findById(fileId);
    if (!file) throw AppError.notFound("File not found.");

    // Same visibility gate as any other resource read — never trust a
    // fileId alone to imply permission.
    await getVisibleOrThrow(file.resource_id, ctx);
    if (file.status !== "READY") throw AppError.notFound("File not found.");

    const url = await getStorageAdapter().createSignedDownloadUrl(
      file.storage_key,
      env.resources.downloadTokenTtlSeconds,
    );
    return { url };
  },

  /**
   * Resolves what the token-gated download route needs: the on-disk
   * path plus response headers. The download token itself already
   * proved permission at the point `getDownloadUrl` issued it — this
   * step only needs to confirm the file still exists and is READY
   * (e.g. it wasn't archived/re-scanned-and-failed after the link was
   * handed out), it does not re-run the ownership/visibility gate.
   */
  async resolveDownload(storageKey: string) {
    const file = await resourceModel.files.findByStorageKey(storageKey);
    if (!file || file.status !== "READY") {
      throw AppError.notFound("File not found.");
    }
    return {
      path: resolveStoragePath(storageKey),
      mimeType: file.detected_mime_type ?? file.declared_mime_type,
      filename: sanitizeFilenameForHeader(file.original_filename),
    };
  },
};
