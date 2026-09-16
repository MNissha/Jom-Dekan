import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useUnreadMessageCount } from "../../hooks/useMessages";

export function MessagesHeaderLink() {
  const unreadCount = useUnreadMessageCount();

  return (
    <Link
      to="/messages"
      aria-label="Messages"
      className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#ECEBF7] text-slate-500 transition motion-safe:duration-150 hover:scale-105 hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 active:scale-95 dark:border-[#332C63] dark:text-slate-300 dark:hover:bg-[#231E4A] dark:hover:text-white"
    >
      <MessageCircle className="h-5 w-5" aria-hidden="true" />
      {unreadCount > 0 && (
        <span
          className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C14634] px-1 text-[10px] font-bold text-white shadow-sm"
          aria-label={`${unreadCount} unread messages`}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

export default MessagesHeaderLink;
