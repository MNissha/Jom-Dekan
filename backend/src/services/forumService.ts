import {
  forumModel,
  toApiForumPost,
  toApiForumPostListItem,
  toApiForumComment,
  toApiForumCommentListItem,
  type ForumPostRow,
  type ForumCommentRow,
  type VoteTargetType,
} from "../models/forumModel";
import { auditLogModel } from "../models/auditLogModel";
import { AppError } from "../types/errors";

interface ActorContext {
  actorUserId: string;
  actorRole: "USER" | "ADMIN";
  requestId?: string;
  ipAddress?: string;
}

function isOwnerOrAdmin(authorId: string, ctx: ActorContext): boolean {
  return authorId === ctx.actorUserId || ctx.actorRole === "ADMIN";
}

/**
 * Pre-flight guards — called before any action that would otherwise
 * land on a stale or deleted target (a comment on a deleted post, a
 * vote on a deleted comment). Same role as resourceService's
 * getVisibleOrThrow: not found or soft-deleted -> 404.
 */
async function getPostOrThrow(postId: string): Promise<ForumPostRow> {
  const post = await forumModel.posts.findById(postId);
  if (!post || post.deleted_at) {
    throw AppError.notFound("Post not found.");
  }
  return post;
}

async function getCommentOrThrow(commentId: string): Promise<ForumCommentRow> {
  const comment = await forumModel.comments.findById(commentId);
  if (!comment || comment.deleted_at) {
    throw AppError.notFound("Comment not found.");
  }
  return comment;
}

export const forumService = {
  posts: {
    async create(input: { title: string; body: string }, ctx: ActorContext) {
      const post = await forumModel.posts.create(ctx.actorUserId, input);
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        action: "FORUM_POST_CREATED",
        targetType: "forum_post",
        targetId: post.id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      return toApiForumPost(post);
    },

    async getById(id: string, ctx: ActorContext) {
      await getPostOrThrow(id);
      const post = await forumModel.posts.findByIdWithVotes(
        id,
        ctx.actorUserId,
      );
      return toApiForumPostListItem(post!);
    },

    async list(
      filters: {
        mine?: boolean;
        unanswered?: boolean;
        solved?: boolean;
        sortBy: "newest" | "oldest" | "top";
        page: number;
        pageSize: number;
      },
      ctx: ActorContext,
    ) {
      const limit = filters.pageSize;
      const offset = (filters.page - 1) * filters.pageSize;

      const { rows, total } = await forumModel.posts.list({
        authorId: filters.mine ? ctx.actorUserId : undefined,
        unanswered: filters.unanswered,
        solved: filters.solved,
        currentUserId: ctx.actorUserId,
        sortBy: filters.sortBy,
        limit,
        offset,
      });

      return {
        data: rows.map(toApiForumPostListItem),
        meta: { page: filters.page, pageSize: filters.pageSize, total },
      };
    },

    async setSolved(id: string, solved: boolean, ctx: ActorContext) {
      const post = await getPostOrThrow(id);
      // Author-only, deliberately not admin-or-owner — whether a
      // question is "solved" is the asker's own judgment call, not
      // something a moderator should be settling on their behalf.
      if (post.author_id !== ctx.actorUserId) throw AppError.forbidden();

      const updated = await forumModel.posts.setSolved(id, solved);
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        action: solved ? "FORUM_POST_SOLVED" : "FORUM_POST_UNSOLVED",
        targetType: "forum_post",
        targetId: id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      return toApiForumPost(updated!);
    },

    async update(
      id: string,
      input: { title: string; body: string },
      ctx: ActorContext,
    ) {
      const post = await getPostOrThrow(id);
      if (!isOwnerOrAdmin(post.author_id, ctx)) throw AppError.forbidden();

      const updated = await forumModel.posts.update(id, input);
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        action: "FORUM_POST_UPDATED",
        targetType: "forum_post",
        targetId: id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      return toApiForumPost(updated!);
    },

    async remove(id: string, ctx: ActorContext) {
      const post = await getPostOrThrow(id);
      if (!isOwnerOrAdmin(post.author_id, ctx)) throw AppError.forbidden();

      await forumModel.posts.softDelete(id);
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        action: "FORUM_POST_DELETED",
        targetType: "forum_post",
        targetId: id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
    },
  },

  comments: {
    async create(postId: string, body: string, ctx: ActorContext) {
      // Never let a comment land on a stale/deleted post — same pattern
      // as favoriteService.add() checking resource visibility before
      // allowing a favorite.
      await getPostOrThrow(postId);

      const comment = await forumModel.comments.create(
        postId,
        ctx.actorUserId,
        body,
      );
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        action: "FORUM_COMMENT_CREATED",
        targetType: "forum_comment",
        targetId: comment.id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      return toApiForumComment(comment);
    },

    async listByPost(postId: string, ctx: ActorContext) {
      await getPostOrThrow(postId);
      const rows = await forumModel.comments.listByPost(
        postId,
        ctx.actorUserId,
      );
      return rows.map(toApiForumCommentListItem);
    },

    async update(id: string, body: string, ctx: ActorContext) {
      const comment = await getCommentOrThrow(id);
      if (!isOwnerOrAdmin(comment.author_id, ctx)) throw AppError.forbidden();

      const updated = await forumModel.comments.update(id, body);
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        action: "FORUM_COMMENT_UPDATED",
        targetType: "forum_comment",
        targetId: id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      return toApiForumComment(updated!);
    },

    async remove(id: string, ctx: ActorContext) {
      const comment = await getCommentOrThrow(id);
      if (!isOwnerOrAdmin(comment.author_id, ctx)) throw AppError.forbidden();

      await forumModel.comments.softDelete(id);
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        action: "FORUM_COMMENT_DELETED",
        targetType: "forum_comment",
        targetId: id,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
    },
  },

  votes: {
    async cast(
      targetType: VoteTargetType,
      targetId: string,
      value: 1 | -1,
      ctx: ActorContext,
    ) {
      // Never let a vote land on a stale/deleted target.
      if (targetType === "forum_post") {
        await getPostOrThrow(targetId);
      } else {
        await getCommentOrThrow(targetId);
      }

      const vote = await forumModel.votes.upsert(
        ctx.actorUserId,
        targetType,
        targetId,
        value,
      );
      await auditLogModel.record({
        actorUserId: ctx.actorUserId,
        actorRole: ctx.actorRole,
        action: "FORUM_VOTE_CAST",
        targetType,
        targetId,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
      return {
        id: vote.id,
        targetType: vote.target_type,
        targetId: vote.target_id,
        value: vote.value,
      };
    },

    async remove(
      targetType: VoteTargetType,
      targetId: string,
      ctx: ActorContext,
    ) {
      const removed = await forumModel.votes.remove(
        ctx.actorUserId,
        targetType,
        targetId,
      );
      if (removed) {
        await auditLogModel.record({
          actorUserId: ctx.actorUserId,
          actorRole: ctx.actorRole,
          action: "FORUM_VOTE_REMOVED",
          targetType,
          targetId,
          requestId: ctx.requestId,
          ipAddress: ctx.ipAddress,
        });
      }
      // Idempotent either way, matching favoriteService.remove().
    },
  },
};
