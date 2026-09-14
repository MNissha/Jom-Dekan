import {
  favoriteModel,
  toApiFavorite,
  toApiFavoriteResourceItem,
  toApiFavoriteForumPostItem,
  toApiFavoriteOpportunityItem,
  type FavoriteTargetType,
} from "../models/favoriteModel";
import { resourceService } from "./resourceService";
import { forumModel } from "../models/forumModel";
import { OpportunityModel } from "../models/opportunityModel";
import { auditLogModel } from "../models/auditLogModel";
import { AppError } from "../types/errors";

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

/**
 * Confirms the target actually exists (and, for resources, is visible
 * to this user) before letting a favorite point at it — mirrors the
 * same "don't favorite something you can't see/that isn't real" gate
 * resources already had, extended to the other two target types.
 */
async function assertTargetExists(
  targetType: FavoriteTargetType,
  targetId: string,
  ctx: ActorContext,
) {
  if (targetType === "resource") {
    // Reuses resourceService's own visibility gate — 404s the same way
    // viewing it directly would, so this never leaks a hidden resource.
    await resourceService.getById(targetId, ctx);
    return;
  }
  if (targetType === "forum_post") {
    const post = await forumModel.posts.findById(targetId);
    if (!post || post.deleted_at) throw AppError.notFound("Post not found.");
    return;
  }
  // opportunity
  const opportunity = await OpportunityModel.findById(targetId);
  if (!opportunity) throw AppError.notFound("Listing not found.");
}

export const favoriteService = {
  async add(targetType: FavoriteTargetType, targetId: string, ctx: ActorContext) {
    await assertTargetExists(targetType, targetId, ctx);

    let row;
    try {
      row = await favoriteModel.create(ctx.actorUserId, targetType, targetId);
    } catch (err) {
      if (isUniqueViolation(err)) {
        // Already favorited — a double-click or replayed request hit
        // the DB constraint from migration 014. Treat it as success,
        // not an error: the end state the caller wanted ("this is
        // favorited") is already true.
        const existing = await favoriteModel.findByUserAndTarget(
          ctx.actorUserId,
          targetType,
          targetId,
        );
        return toApiFavorite(existing!);
      }
      throw err;
    }

    await auditLogModel.record({
      actorUserId: ctx.actorUserId,
      actorRole: ctx.actorRole,
      action: "FAVORITE_ADDED",
      targetType,
      targetId,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });

    return toApiFavorite(row);
  },

  async remove(targetType: FavoriteTargetType, targetId: string, ctx: ActorContext) {
    const removed = await favoriteModel.remove(ctx.actorUserId, targetType, targetId);
    if (removed) {
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        action: "FAVORITE_REMOVED",
        targetType,
        targetId,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
    }
    // Idempotent either way — removing a favorite that doesn't exist is
    // not an error, it's just already the desired state.
  },

  async isFavorited(targetType: FavoriteTargetType, targetId: string, ctx: ActorContext) {
    const existing = await favoriteModel.findByUserAndTarget(
      ctx.actorUserId,
      targetType,
      targetId,
    );
    return { isFavorited: existing !== null };
  },

  async list(
    filters: { targetType: FavoriteTargetType; page: number; pageSize: number },
    ctx: ActorContext,
  ) {
    const limit = filters.pageSize;
    const offset = (filters.page - 1) * filters.pageSize;
    const listParams = { userId: ctx.actorUserId, limit, offset };

    if (filters.targetType === "forum_post") {
      const { rows, total } = await favoriteModel.listForumPosts(listParams);
      return {
        data: rows.map(toApiFavoriteForumPostItem),
        meta: { page: filters.page, pageSize: filters.pageSize, total },
      };
    }
    if (filters.targetType === "opportunity") {
      const { rows, total } = await favoriteModel.listOpportunities(listParams);
      return {
        data: rows.map(toApiFavoriteOpportunityItem),
        meta: { page: filters.page, pageSize: filters.pageSize, total },
      };
    }

    const { rows, total } = await favoriteModel.listResources(listParams);
    return {
      data: rows.map(toApiFavoriteResourceItem),
      meta: { page: filters.page, pageSize: filters.pageSize, total },
    };
  },
};
