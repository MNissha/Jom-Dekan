import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  usePost,
  useComments,
  useUpdatePost,
  useDeletePost,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from "../hooks/useForum";
import { useCurrentUser } from "../hooks/useAuth";
import { VoteButtons } from "../components/common/VoteButtons";
import { CommentReportButton } from "../components/common/CommentReportButton";
import { UserLink } from "../components/common/UserLink";
import { useMinimumLoading } from "../hooks/useMinimumLoading";
import { ArrowLeft } from "lucide-react";

function DiscussionDetailSkeleton() {
  return (
    <div className="page-container page-container-reading animate-pulse" aria-label="Loading discussion">
      <div className="h-4 w-36 rounded bg-violet-100" />
      <div className="mt-5 rounded-[24px] border border-violet-100 bg-white p-6 shadow-sm">
        <div className="h-7 w-3/4 rounded bg-violet-100" />
        <div className="mt-5 h-4 w-full rounded bg-slate-100" />
        <div className="mt-2 h-4 w-5/6 rounded bg-slate-100" />
      </div>
      <div className="mt-7 h-6 w-28 rounded bg-violet-100" />
      <div className="mt-3 h-24 rounded-2xl bg-white shadow-sm" />
      {[0, 1].map((item) => <div key={item} className="mt-4 h-20 rounded-2xl border border-violet-100 bg-white shadow-sm" />)}
    </div>
  );
}

export default function ForumPostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { data: post, isLoading, isError } = usePost(id);
  const { data: comments, isLoading: commentsLoading } = useComments(id);
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();
  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [commentVisibility, setCommentVisibility] = useState<Record<string, boolean>>({});
  const showSkeleton = useMinimumLoading(isLoading || commentsLoading, 600);

  if (showSkeleton) return <DiscussionDetailSkeleton />;

  if (isLoading)
    return (
      <p className="page-container page-container-reading text-body-sm text-content-muted">
        Loading…
      </p>
    );
  if (isError || !post)
    return (
      <div className="page-container page-container-reading">
        <p className="text-sm text-red-600">
          This post does not exist, or it has been deleted.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="group mt-2 mb-2 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition motion-safe:duration-150 hover:text-primary-700"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 transition-transform motion-safe:duration-150 group-hover:-translate-x-1 group-hover:border-primary-300 group-hover:bg-primary-50">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </div>
          Back
        </button>
      </div>
    );

  const isOwner = user?.id === post.authorId;
  const canManage = isOwner || user?.role === "ADMIN";

  const startEditing = () => {
    setEditTitle(post.title);
    setEditBody(post.body);
    setIsEditing(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePost.mutate(
      { postId: post.id, data: { title: editTitle, body: editBody } },
      { onSuccess: () => setIsEditing(false) },
    );
  };

  const handleDeletePost = () => {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`))
      return;
    deletePost.mutate(post.id, { onSuccess: () => navigate("/forum") });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    createComment.mutate(
      { postId: post.id, body: commentBody },
      { onSuccess: () => setCommentBody("") },
    );
  };

  const startEditingComment = (commentId: string, body: string) => {
    setEditingCommentId(commentId);
    setEditingCommentBody(body);
  };

  const handleSaveComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCommentId) return;
    updateComment.mutate(
      { commentId: editingCommentId, body: editingCommentBody },
      { onSuccess: () => setEditingCommentId(null) },
    );
  };

  const handleDeleteComment = (commentId: string) => {
    if (!window.confirm("Delete this comment? This cannot be undone.")) return;
    deleteComment.mutate(commentId);
  };

  const hideComment = (commentId: string) => {
    setCommentVisibility((current) => ({ ...current, [commentId]: true }));
  };

  const showComment = (commentId: string) => {
    setCommentVisibility((current) => ({ ...current, [commentId]: false }));
  };

  return (
    <div className="page-container page-container-reading motion-safe:animate-content-enter">

      <Link to="/forum" className="group mt-2 mb-2 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition motion-safe:duration-150 hover:text-primary-700">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 transition-transform motion-safe:duration-150 group-hover:-translate-x-1 group-hover:border-primary-300 group-hover:bg-primary-50">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </div>
        Back
      </Link>

      <article className="card-base card-static mt-4 p-grid-5 sm:p-grid-6">
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-slate-700"
              >
                Title
              </label>
              <input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label
                htmlFor="body"
                className="block text-sm font-medium text-slate-700"
              >
                Body
              </label>
              <textarea
                id="body"
                rows={5}
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={updatePost.isPending}
                className="rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-start gap-4">
              <VoteButtons
                targetType="forum_post"
                targetId={post.id}
                voteScore={post.voteScore}
                myVote={post.myVote}
              />
              <div className="flex-1">
                <h1 className="break-words text-2xl font-heading leading-tight tracking-tight text-content-primary sm:text-page-title">
                  {post.title}
                </h1>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Posted by <UserLink userId={post.authorId} name={post.authorName} className="font-semibold text-slate-500 hover:text-primary-700 hover:underline" />
                  {" · "}
                  {new Date(post.createdAt).toLocaleDateString()}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-slate-600">
                  {post.body}
                </p>
              </div>
            </div>

            {canManage && (
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={startEditing}
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDeletePost}
                  disabled={deletePost.isPending}
                  className="rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  {deletePost.isPending ? "Deleting…" : "Delete"}
                </button>
              </div>
            )}
          </>
        )}
      </article>

      <section className="mt-grid-6" aria-labelledby="comments-heading">
        <h2 id="comments-heading" className="text-section-title text-content-primary">Discussion</h2>
        <p className="mt-1 text-sm text-content-secondary">{(comments ?? []).length} {(comments ?? []).length === 1 ? "comment" : "comments"}</p>

        <form onSubmit={handleAddComment} className="mt-grid-3 rounded-card border border-border bg-surface-card p-grid-3 shadow-sm">
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Add a comment…"
            required
            rows={2}
            className="min-h-20 w-full resize-y rounded-control border border-border bg-surface-page px-grid-3 py-grid-2 text-body-sm text-content-primary placeholder:text-content-muted focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={createComment.isPending}
            className="mt-grid-2 inline-flex min-h-control-sm items-center self-end rounded-full bg-primary-600 px-grid-4 text-label text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createComment.isPending ? "Posting…" : "Comment"}
          </button>
        </form>

        <div className="mt-grid-4 flex flex-col gap-grid-2">
          {(comments ?? []).map((comment, index) => {
            const commentCanManage =
              user?.id === comment.authorId || user?.role === "ADMIN";
            const commentIsHidden = commentVisibility[comment.id] ?? comment.myVote === -1;
            return (
              <div
                key={comment.id}
                style={{ animationDelay: `${index * 70}ms` }}
                className="card-base card-static card-comment flex gap-grid-3 px-grid-4 py-grid-3 motion-safe:animate-content-enter"
              >
                <VoteButtons
                  targetType="forum_comment"
                  targetId={comment.id}
                  voteScore={comment.voteScore}
                  myVote={comment.myVote}
                  onDislike={() => hideComment(comment.id)}
                  onUndoDislike={() => showComment(comment.id)}
                />
                {commentIsHidden ? (
                  <div className="flex min-h-8 flex-1 items-center">
                    <p className="text-sm italic text-slate-400">Comment hidden. Click dislike again to show it.</p>
                  </div>
                ) : <div className="flex-1">
                  {editingCommentId === comment.id ? (
                    <form
                      onSubmit={handleSaveComment}
                      className="flex flex-col gap-2"
                    >
                      <textarea
                        value={editingCommentBody}
                        onChange={(e) => setEditingCommentBody(e.target.value)}
                        rows={2}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={updateComment.isPending}
                          className="rounded-full bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCommentId(null)}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-slate-400">
                        <UserLink userId={comment.authorId} name={comment.authorName} className="font-semibold text-slate-500 hover:text-primary-700 hover:underline" />
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                        {comment.body}
                      </p>
                      {commentCanManage && (
                        <div className="mt-2 flex gap-3 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              startEditingComment(comment.id, comment.body)
                            }
                            className="text-primary-700 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-red-700 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>}
                {!commentIsHidden && user && user.id !== comment.authorId && (
                  <CommentReportButton
                    commentId={comment.id}
                    postId={post.id}
                    commentText={comment.body}
                  />
                )}
              </div>
            );
          })}
          {(comments ?? []).length === 0 && (
            <p className="rounded-2xl border border-[#ECEBF7] bg-white p-4 text-sm text-slate-500">
              No comments yet — be the first to reply.
            </p>
          )}
        </div>
      </section>

    </div>
  );
}
