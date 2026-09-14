import { auditLogModel } from "../models/auditLogModel";
import {
  resourceCommentModel,
  toApiResourceComment,
} from "../models/resourceCommentModel";
import { resourceService } from "./resourceService";
import { AppError } from "../types/errors";

interface ActorContext {
  actorUserId: string;
  actorRole: "USER" | "ADMIN";
  requestId?: string;
  ipAddress?: string;
}

export const resourceCommentService = {
  async list(resourceId: string, ctx: ActorContext) {
    await resourceService.getById(resourceId, ctx);
    const rows = await resourceCommentModel.listByResource(resourceId);
    return rows.map(toApiResourceComment);
  },

  async create(resourceId: string, body: string, ctx: ActorContext) {
    await resourceService.getById(resourceId, ctx);
    const row = await resourceCommentModel.create(
      resourceId,
      ctx.actorUserId,
      body,
    );
    await auditLogModel.record({
      actorUserId: ctx.actorUserId,
      actorRole: ctx.actorRole,
      action: "RESOURCE_COMMENT_CREATED",
      targetType: "resource_comment",
      targetId: row.id,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });
    return toApiResourceComment(row);
  },

  async update(id: string, body: string, ctx: ActorContext) {
    const row = await resourceCommentModel.findById(id);
    if (!row || row.deleted_at) throw AppError.notFound("Comment not found.");
    await resourceService.getById(row.resource_id, ctx);
    if (row.author_id !== ctx.actorUserId && ctx.actorRole !== "ADMIN") {
      throw AppError.forbidden();
    }
    const updated = await resourceCommentModel.update(id, body);
    return toApiResourceComment(updated!);
  },

  async remove(id: string, ctx: ActorContext) {
    const row = await resourceCommentModel.findById(id);
    if (!row || row.deleted_at) throw AppError.notFound("Comment not found.");
    await resourceService.getById(row.resource_id, ctx);
    if (row.author_id !== ctx.actorUserId && ctx.actorRole !== "ADMIN") {
      throw AppError.forbidden();
    }
    await resourceCommentModel.softDelete(id);
  },
};
