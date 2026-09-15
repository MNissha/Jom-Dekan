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
    <div className="mx-auto max-w-3xl animate-pulse px-[18px] py-[22px]" aria-label="Loading discussion">
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
  const showSkeleton = useMinimumLoading(isLoading || commentsLoading, 2000);

  if (showSkeleton) return <DiscussionDetailSkeleton />;

  if (isLoading)
    return (
      <p className="mx-auto max-w-3xl px-[18px] py-[22px] text-sm text-slate-500">
        Loading…
      </p>
    );
  if (isError || !post)
    return (
      <div className="mx-auto max-w-3xl px-[18px] py-[22px]">
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
    <div className="relative mx-auto max-w-3xl px-[18px] py-[22px] motion-safe:animate-[fadeIn_300ms_ease-out]">
      <div className="pointer-events-none absolute -right-10 top-16 -z-10 h-44 w-44 rounded-full bg-violet-200/30 blur-3xl" aria-hidden="true" />

      <Link to="/forum" className="group mt-2 mb-2 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition motion-safe:duration-150 hover:text-primary-700">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 transition-transform motion-safe:duration-150 group-hover:-translate-x-1 group-hover:border-primary-300 group-hover:bg-primary-50">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </div>
        Back
      </Link>

      <div className="group mt-4 overflow-hidden rounded-[24px] border border-[#E4E0FA] bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-xl">
        <div className="-mx-6 -mt-6 mb-5 h-1.5 bg-gradient-to-r from-[#4338CA] via-violet-500 to-[#F5C21A]" aria-hidden="true" />
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
                <h1 className="text-2xl font-bold text-slate-900">
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
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-slate-800">Comments</h2>

        <form onSubmit={handleAddComment} className="mt-3 flex flex-col gap-2">
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Add a comment…"
            required
            rows={3}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={createComment.isPending}
            className="self-start rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {createComment.isPending ? "Posting…" : "Comment"}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3">
          {(comments ?? []).map((comment, index) => {
            const commentCanManage =
              user?.id === comment.authorId || user?.role === "ADMIN";
            const commentIsHidden = commentVisibility[comment.id] ?? comment.myVote === -1;
            return (
              <div
                key={comment.id}
                style={{ animationDelay: `${index * 70}ms` }}
                className="group/comment relative flex gap-3 overflow-hidden rounded-2xl border border-[#ECEBF7] bg-white p-4 shadow-sm transition duration-200 motion-safe:animate-[notificationRise_320ms_ease-out_both] hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
              >
                <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#6D5CE7] to-[#4338CA] opacity-0 transition group-hover/comment:opacity-100" aria-hidden="true" />
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
      </div>

    </div>
  );
}
