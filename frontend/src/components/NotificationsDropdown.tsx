import { useState, useEffect } from "react";
import { moderationService } from "../service/moderationService";
import type { Notification } from "../types/moderation";

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    moderationService
      .getNotifications()
      .then((data) => setNotifications(data))
      .catch(() => setNotifications([]));
  }, []);

  const handleRead = async (id: string) => {
    await moderationService.markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
      ),
    );
  };

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg p-4 z-50">
      <h3 className="font-bold text-stone-800 border-b pb-2 mb-2">
        Notifications
      </h3>
      {notifications.length === 0 ? (
        <p className="text-sm text-stone-500 py-4 text-center">
          No new notifications
        </p>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-2 rounded text-sm ${n.read_at ? "bg-stone-50" : "bg-amber-50 border-l-4 border-amber-600"}`}
            >
              <p className="font-semibold text-stone-900">{typeof n.payload.title === "string" ? n.payload.title : "Notification"}</p>
              <p className="text-stone-600 text-xs mt-1">{typeof n.payload.message === "string" ? n.payload.message : "You have a new update."}</p>
              {!n.read_at && (
                <button
                  onClick={() => handleRead(n.id)}
                  className="text-xs text-amber-700 mt-2 underline"
                >
                  Mark as read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
