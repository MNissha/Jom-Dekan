import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useCreateOrGetConversation } from "../../hooks/useMessages";

export function MessageButton({ targetUserId }: { targetUserId: string }) {
  const navigate = useNavigate();
  const createOrGetConversation = useCreateOrGetConversation();

  function handleClick() {
    createOrGetConversation.mutate(targetUserId, {
      onSuccess: (conversation) => navigate(`/messages/${conversation.id}`),
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={createOrGetConversation.isPending}
      className="flex h-9 items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 text-sm font-bold text-white transition motion-safe:duration-150 hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      {createOrGetConversation.isPending ? "Opening…" : "Message"}
    </button>
  );
}

export default MessageButton;
