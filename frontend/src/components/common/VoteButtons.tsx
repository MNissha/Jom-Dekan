import { useEffect, useState } from "react";
import { Heart, ThumbsDown } from "lucide-react";
import { useCastVote, useRemoveVote } from "../../hooks/useForum";
import type { VoteTargetType } from "../../types/forum";

export function VoteButtons({
  targetType,
  targetId,
  voteScore,
  myVote,
  onDislike,
  onUndoDislike,
}: {
  targetType: VoteTargetType;
  targetId: string;
  voteScore: number;
  myVote: number;
  onDislike?: () => void;
  onUndoDislike?: () => void;
}) {
  const castVote = useCastVote();
  const removeVote = useRemoveVote();
  const isPending = castVote.isPending || removeVote.isPending;

  // Optimistic: updates the instant you click rather than waiting for
  // the request + cache invalidation to round-trip first. Clears itself
  // once the real (refetched) data matches the prediction, or
  // immediately if the request fails.
  const [optimistic, setOptimistic] = useState<{ voteScore: number; myVote: number } | null>(null);
  useEffect(() => {
    if (optimistic && voteScore === optimistic.voteScore && myVote === optimistic.myVote) {
      setOptimistic(null);
    }
  }, [voteScore, myVote, optimistic]);

  const displayScore = optimistic?.voteScore ?? voteScore;
  const displayMyVote = optimistic?.myVote ?? myVote;

  const handleVote = (value: 1 | -1) => {
    const nextMyVote = displayMyVote === value ? 0 : value;
    const nextScore = Math.max(
      0,
      displayScore + (nextMyVote === 1 ? 1 : 0) - (displayMyVote === 1 ? 1 : 0),
    );
    setOptimistic({ voteScore: nextScore, myVote: nextMyVote });

    if (nextMyVote === 0) {
      removeVote.mutate(
        { targetType, targetId },
        {
          onError: () => setOptimistic(null),
          onSuccess: () => {
            if (value === -1 && targetType === "forum_comment") onUndoDislike?.();
          },
        },
      );
    } else {
      castVote.mutate(
        { targetType, targetId, value },
        {
          onError: () => setOptimistic(null),
          onSuccess: () => {
            if (value === -1 && targetType === "forum_comment") onDislike?.();
          },
        },
      );
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => handleVote(1)}
        disabled={isPending}
        aria-label={displayMyVote === 1 ? "Remove like" : "Like"}
        aria-pressed={displayMyVote === 1}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60 ${
          displayMyVote === 1 ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300" : "text-content-muted hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
        }`}
      >
        <Heart className={`h-4 w-4 ${displayMyVote === 1 ? "fill-current" : ""}`} aria-hidden="true" />
      </button>
      <span className="min-w-5 text-center text-sm font-semibold text-content-secondary">
        {displayScore}
      </span>
      <button
        type="button"
        onClick={() => handleVote(-1)}
        disabled={isPending}
        aria-label={targetType === "forum_comment" ? "Hide this comment" : "Dislike"}
        title={targetType === "forum_comment" ? "Hide this comment from your view" : "Dislike"}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60 ${
          displayMyVote === -1 ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300" : "text-content-muted hover:bg-surface-muted"
        }`}
      >
        <ThumbsDown className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
