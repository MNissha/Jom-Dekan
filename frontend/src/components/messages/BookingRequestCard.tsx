import { Calendar, Check, Mail, Phone, User, X } from "lucide-react";
import { useCurrentUser } from "../../hooks/useAuth";
import { useBookingById, useDecideBooking } from "../../hooks/useTutor";
import { RescheduleBookingButton } from "../common/RescheduleBookingButton";
import type { Message, BookingRequestMetadata } from "../../types/message";
import { cardClassName, StatusIndicator, type StatusTone } from "../common/cards";

function readMetadata(message: Message): BookingRequestMetadata {
  const m = message.metadata as Partial<BookingRequestMetadata>;
  return {
    bookingId: m.bookingId ?? "",
    subjectName: m.subjectName ?? null,
    requestedStartAt: m.requestedStartAt ?? message.createdAt,
    durationMinutes: m.durationMinutes ?? 60,
    note: m.note ?? null,
    studentName: m.studentName ?? null,
    studentEmail: m.studentEmail ?? null,
    studentPhone: m.studentPhone ?? null,
    isReschedule: m.isReschedule ?? false,
  };
}

const STATUS_TONE: Record<string, StatusTone> = {
  pending: "warning",
  accepted: "success",
  declined: "danger",
};

export function BookingRequestCard({ message }: { message: Message }) {
  const metadata = readMetadata(message);
  const currentUser = useCurrentUser();
  const { data: booking } = useBookingById(metadata.bookingId || undefined);
  const decideBooking = useDecideBooking();

  const status = booking?.status ?? "pending";
  const isTutor = Boolean(booking && currentUser && booking.tutorId === currentUser.id);
  const isParty = Boolean(
    booking && currentUser && (booking.tutorId === currentUser.id || booking.studentId === currentUser.id),
  );
  // Prefer the live booking's time/duration once loaded — a reschedule
  // changes these on the booking itself, not this message's original
  // snapshot, so falling back to metadata avoids showing a stale time.
  const requestedStartAt = booking?.requestedStartAt ?? metadata.requestedStartAt;
  const durationMinutes = booking?.durationMinutes ?? metadata.durationMinutes;
  const isReschedule = Boolean(metadata.isReschedule);
  const canDecide = Boolean(
    booking &&
    currentUser &&
    status === "pending" &&
    (booking.rescheduleProposedBy
      ? isReschedule && currentUser.id !== booking.rescheduleProposedBy && isParty
      : isTutor),
  );

  return (
    <div className={cardClassName("booking", "max-w-[92%] text-body-sm sm:max-w-[85%]")}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary-700 dark:text-primary-300">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          {isReschedule ? "Reschedule proposal" : "Booking request"}
        </span>
        <StatusIndicator tone={STATUS_TONE[status] ?? "neutral"}>{status}</StatusIndicator>
      </div>

      <dl className="mt-3 space-y-1.5 text-slate-700 dark:text-slate-200">
        <div>
          <span className="font-semibold">{metadata.subjectName ?? "Subject not specified"}</span>
        </div>
        <div className="text-slate-600 dark:text-slate-300">
          {new Date(requestedStartAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · {durationMinutes} min
        </div>
        {metadata.note && <div className="italic text-slate-500 dark:text-slate-400">&quot;{metadata.note}&quot;</div>}
      </dl>

      <div className="mt-3 space-y-1 border-t border-[#F1F0FA] pt-3 text-xs text-slate-500 dark:border-[#332C63] dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" aria-hidden="true" />
          {metadata.studentName ?? "Student"}
        </div>
        {metadata.studentEmail && (
          <div className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            {metadata.studentEmail}
          </div>
        )}
        {metadata.studentPhone && (
          <div className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            {metadata.studentPhone}
          </div>
        )}
      </div>

      {canDecide && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => decideBooking.mutate({ bookingId: metadata.bookingId, status: "accepted" })}
            disabled={decideBooking.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {isReschedule ? "Confirm new time" : "Accept"}
          </button>
          <button
            type="button"
            onClick={() => decideBooking.mutate({ bookingId: metadata.bookingId, status: "declined" })}
            disabled={decideBooking.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E4E3F2] px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-[#332C63] dark:text-slate-200"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            {isReschedule ? "Decline new time" : "Decline"}
          </button>
          {!isReschedule && <RescheduleBookingButton bookingId={metadata.bookingId} />}
        </div>
      )}

      {isParty && status === "accepted" && (
        <div className="mt-3">
          <RescheduleBookingButton bookingId={metadata.bookingId} />
        </div>
      )}
    </div>
  );
}

export default BookingRequestCard;
