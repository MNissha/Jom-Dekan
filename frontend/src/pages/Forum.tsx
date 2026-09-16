import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { MessageSquare, Search, Plus, ThumbsUp, X, CheckCircle2, Circle } from "lucide-react";
import { usePosts, useCreatePost, useCastVote, useRemoveVote, useSetPostSolved } from "../hooks/useForum";
import { useCurrentUser } from "../hooks/useAuth";
import { EmptyState } from "../components/common/EmptyState";
import { FavoriteButton } from "../components/common/FavoriteButton";
import { ReportButton } from "../components/common/ReportButton";
import { ForumPostSkeleton } from "../components/forum/ForumPostSkeleton";
import { UserLink } from "../components/common/UserLink";
import type { ForumPostListItem } from "../types/forum";
import { useMinimumLoading } from "../hooks/useMinimumLoading";
import { cardClassName } from "../components/common/cards";

const PAGE_SIZE = 12;
const EMPTY_POSTS: ForumPostListItem[] = [];
type SortBy = "newest" | "oldest" | "top";

const TABS = [
  { key: "all", label: "All" },
  { key: "unanswered", label: "Unanswered" },
  { key: "solved", label: "Solved" },
  { key: "mine", label: "My threads" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// Keeps the skeleton on screen for at least `minMs` even when the real
// fetch resolves faster, so the loading state never just flashes by —
// tracked per loading transition (not just on mount) so it also applies
// to refetches from changing sort/page/filters.
// A vertical vote box matching the reference design's compact "N / VOTES"
// look, but still fully functional (unlike the static reference) — the
// up/down controls reveal on hover/focus instead of sitting inline, so it
// stays visually clean while keeping the real vote mutations.
function ForumVoteBox({
  targetId,
  voteScore,
  myVote,
}: {
  targetId: string;
  voteScore: number;
  myVote: number;
}) {
  const castVote = useCastVote();
  const removeVote = useRemoveVote();
  const isPending = castVote.isPending || removeVote.isPending;

  // Optimistic: the score/highlight update the instant you click, rather
  // than waiting for the request + cache invalidation to round-trip
  // before anything on screen moves. Clears itself once the real data
  // (from the invalidated query's refetch) catches up to the prediction,
  // or immediately on error.
  const [optimistic, setOptimistic] = useState<{ voteScore: number; myVote: number } | null>(null);
  useEffect(() => {
    if (optimistic && voteScore === optimistic.voteScore && myVote === optimistic.myVote) {
      setOptimistic(null);
    }
  }, [voteScore, myVote, optimistic]);

  const displayScore = optimistic?.voteScore ?? voteScore;
  const displayMyVote = optimistic?.myVote ?? myVote;

  const handleLike = () => {
    const nextMyVote = displayMyVote === 1 ? 0 : 1;
    setOptimistic({
      voteScore: Math.max(0, displayScore + (nextMyVote === 1 ? 1 : 0) - (displayMyVote === 1 ? 1 : 0)),
      myVote: nextMyVote,
    });

    if (nextMyVote === 0) {
      removeVote.mutate({ targetType: "forum_post", targetId }, { onError: () => setOptimistic(null) });
    } else {
      castVote.mutate(
        { targetType: "forum_post", targetId, value: 1 },
        { onError: () => setOptimistic(null) },
      );
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleLike();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      disabled={isPending}
      aria-label={displayMyVote === 1 ? "Remove like" : "Like this discussion"}
      aria-pressed={displayMyVote === 1}
      className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-caption font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60 ${
        displayMyVote === 1
          ? "border-primary-200 bg-primary-50 text-primary-600 dark:border-primary-400/30 dark:bg-primary-900/30 dark:text-primary-300"
          : "border-border bg-surface-card text-content-muted hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 dark:hover:border-primary-400/30 dark:hover:bg-primary-900/30 dark:hover:text-primary-300"
      }`}
    >
      <ThumbsUp className={`h-4 w-4 ${displayMyVote === 1 ? "fill-current" : ""}`} aria-hidden="true" />
      <span>{displayScore}</span>
      <span className="sr-only">likes</span>
    </button>
  );
}

// One element that's either a plain status pill (everyone else) or a
// clickable toggle that IS the pill (the thread's own author) — kept as
// a single component sharing one optimistic value so the label/color
// never has two sources of truth that could disagree mid-click.
function SolvedBadge({
  postId,
  solved,
  isOwner,
}: {
  postId: string;
  solved: boolean;
  isOwner: boolean;
}) {
  const setSolvedMutation = useSetPostSolved();

  // Optimistic, same reasoning as ForumVoteBox: flip immediately, only
  // revert if the request actually fails.
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  useEffect(() => {
    if (optimistic !== null && solved === optimistic) setOptimistic(null);
  }, [solved, optimistic]);
  const displaySolved = optimistic ?? solved;
  const badgeClass = displaySolved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700";

  const statusPill = (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeClass}`}>
      {displaySolved ? "Solved" : "Open"}
    </span>
  );

  if (!isOwner) return statusPill;

  // A plain status pill reads as a label, not a button — easy to miss
  // as something you can click. The owner gets the pill PLUS an
  // explicit, clearly-actionable button next to it (visible border,
  // an imperative label, a hover state), rather than trying to make
  // the pill itself double as a barely-distinguishable button.
  return (
    <>
      {statusPill}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const next = !displaySolved;
          setOptimistic(next);
          setSolvedMutation.mutate({ postId, solved: next }, { onError: () => setOptimistic(null) });
        }}
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold transition motion-safe:duration-150 ${
          displaySolved
            ? "border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
            : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        }`}
      >
        {displaySolved ? (
          <Circle className="h-3 w-3" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        )}
        {displaySolved ? "Mark unsolved" : "Mark solved"}
      </button>
    </>
  );
}

export default function Forum() {
  const user = useCurrentUser();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // Debounced — filtering only runs once typing pauses, not on every
  // keystroke.
  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  function changeTab(key: TabKey) {
    setActiveTab(key);
    setPage(1);
  }

  const { data, isLoading, isError } = usePosts({
    sortBy,
    page,
    pageSize: PAGE_SIZE,
    mine: activeTab === "mine" ? true : undefined,
    unanswered: activeTab === "unanswered" ? true : undefined,
    solved: activeTab === "solved" ? true : undefined,
  });
  const showSkeleton = useMinimumLoading(isLoading, 600);
  const createPost = useCreatePost();
  const allPosts = data?.data ?? EMPTY_POSTS;
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Title/body search is still client-side over the fetched page — the
  // forum API has no full-text search for posts (unlike resources, which
  // do), so this covers the current page rather than the whole forum.
  const q = search.toLowerCase();
  const posts = useMemo(() => {
    if (!q) return allPosts;
    return allPosts.filter(
      (post: ForumPostListItem) => post.title.toLowerCase().includes(q) || post.body.toLowerCase().includes(q),
    );
  }, [allPosts, q]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createPost.mutate(
      { title, body },
      {
        onSuccess: () => {
          setTitle("");
          setBody("");
          setIsCreating(false);
        },
      },
    );
  };

  return (
    <div className="page-container page-container-standard">
      <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-content-primary">Discussions</h1>
            <p className="mt-1 max-w-2xl text-sm text-content-secondary">
              Ask questions, share ideas, and help other students.
            </p>
          </div>
          <button type="button" onClick={() => setIsCreating(true)} className="inline-flex min-h-control items-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-bold text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
            <Plus className="h-4 w-4" aria-hidden="true" />New post
          </button>
      </div>

      {/* New-post modal — same gradient-header treatment as the
          Apply-to-tutor / Post-an-opportunity modals so the marketplace
          and forum feel like one consistent app rather than two styles. */}
      {isCreating && createPortal(
        <div role="dialog" aria-modal="true" aria-label="New discussion post" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8">
          <div className="w-full max-w-[560px] overflow-hidden rounded-[24px] bg-white shadow-2xl">
            <div
              className="flex items-start justify-between gap-4 p-[22px] text-white"
              style={{ background: "radial-gradient(120% 160% at 88% 8%, #4A3FD1 0%, #2E2372 55%, #231C57 100%)" }}
            >
              <div className="min-w-0">
                <span className="inline-block rounded-full bg-[rgba(245,194,26,.2)] px-2.5 py-1 text-[11px] font-bold tracking-wide text-[#FFE9A6]">
                  NEW POST
                </span>
                <h2 className="mt-2 text-xl font-extrabold">Start a discussion</h2>
                <p className="mt-1 text-sm font-medium text-[#C6C2EC]">
                  Ask a question, share something, or help a fellow student out.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto p-[22px]">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-500">
                  Title<span className="text-red-500"> *</span>
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's your question or topic?"
                  required
                  minLength={2}
                  className="h-11 rounded-xl border border-[#E4E3F2] bg-[#FBFBFE] px-3 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-500">
                  Details<span className="text-red-500"> *</span>
                </span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Give enough context for others to help…"
                  required
                  rows={5}
                  className="resize-y rounded-xl border border-[#E4E3F2] bg-[#FBFBFE] p-3 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </label>

              <div className="flex flex-wrap justify-end gap-3 border-t border-[#F1F0FA] pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="rounded-xl border border-[#E4E3F2] px-5 py-3 text-sm font-bold text-slate-700 hover:border-primary-300 hover:text-primary-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPost.isPending}
                  className="rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white transition motion-safe:duration-150 hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createPost.isPending ? "Posting…" : "Post"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}

      <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => changeTab(key)}
            aria-pressed={activeTab === key}
            className="filter-chip px-4 text-sm font-bold"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search posts on this page…"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as SortBy);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="top">Most popular</option>
        </select>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {showSkeleton ? (
          Array.from({ length: 4 }).map((_, i) => <ForumPostSkeleton key={i} />)
        ) : isError ? (
          <EmptyState
            icon={MessageSquare}
            title="Could not load posts"
            description="Something went wrong while fetching the forum. Please try again."
          />
        ) : posts.length > 0 ? (
          posts.map((post, i) => (
            <Link
              key={post.id}
              to={`/forum/${post.id}`}
              style={{ animationDelay: `${i * 40}ms` }}
              className={cardClassName("forum-post", "group flex items-start gap-4 text-left motion-safe:animate-[fadeIn_300ms_ease-out_both]")}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <SolvedBadge
                    postId={post.id}
                    solved={Boolean(post.solvedAt)}
                    isOwner={Boolean(user && post.authorId === user.id)}
                  />
                  {post.commentCount === 0 && (
                    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
                      Unanswered
                    </span>
                  )}
                </div>
                <h2 className="mt-grid-2 break-words text-subsection-title text-content-primary transition motion-safe:duration-fast group-hover:text-brand-primary">
                  {post.title}
                </h2>
                <p className="mt-grid-1 line-clamp-2 max-w-3xl break-words text-body-sm leading-relaxed text-content-secondary">{post.body}</p>
                <div className="mt-grid-3 flex flex-wrap items-center gap-grid-3">
                  <ForumVoteBox targetId={post.id} voteScore={post.voteScore} myVote={post.myVote} />
                  <p className="text-caption font-semibold text-content-muted">
                  <UserLink userId={post.authorId} name={post.authorName} className="font-semibold text-slate-500 hover:text-primary-700 hover:underline" />
                  {" · "}
                  {new Date(post.createdAt).toLocaleDateString()} · {post.commentCount}{" "}
                  {post.commentCount === 1 ? "reply" : "replies"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-grid-1">
                <FavoriteButton targetType="forum_post" targetId={post.id} />
                <ReportButton targetType="forum_post" targetId={post.id} />
              </div>
            </Link>
          ))
        ) : (
          <EmptyState
            icon={MessageSquare}
            title={
              search
                ? "No matching posts"
                : activeTab === "mine"
                  ? "You haven't posted any threads yet"
                  : activeTab !== "all"
                    ? "No matching posts"
                    : "No posts yet"
            }
            description={
              search
                ? "Try a different search or switch tabs."
                : activeTab === "mine"
                  ? "Start a discussion and it'll show up here."
                  : activeTab !== "all"
                    ? "Try a different search or switch tabs."
                    : "Be the first to start a discussion in this forum."
            }
          />
        )}
      </div>

      {allPosts.length > 0 && (
        <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {page} of {totalPages} ({total} result{total === 1 ? "" : "s"})
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-full bg-slate-100 px-4 py-1.5 font-medium text-slate-600 transition motion-safe:duration-150 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-full bg-slate-100 px-4 py-1.5 font-medium text-slate-600 transition motion-safe:duration-150 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
