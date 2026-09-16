import { useState, type FormEvent } from "react";
import axios from "axios";
import { CalendarClock } from "lucide-react";
import { useRescheduleBooking } from "../../hooks/useTutor";

/** Inline (not a portal/modal) reschedule affordance — drops into a
 * booking row or message card. Works for either party: whoever isn't
 * the proposer must reconfirm if the booking was already accepted. */
export function RescheduleBookingButton({
  bookingId,
  triggerClassName,
  onDone,
}: {
  bookingId: string;
  triggerClassName?: string;
  onDone?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const reschedule = useRescheduleBooking();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!date || !time) return;
    reschedule.mutate(
      { bookingId, data: { requestedStartAt: new Date(`${date}T${time}`).toISOString() } },
      {
        onSuccess: () => {
          setIsOpen(false);
          setDate("");
          setTime("");
          onDone?.();
        },
      },
    );
  }

  const serverError =
    reschedule.isError && axios.isAxiosError(reschedule.error)
      ? (reschedule.error.response?.data as { error?: { message?: string } })?.error?.message
      : null;

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          reschedule.reset();
          setIsOpen(true);
        }}
        className={
          triggerClassName ??
          "inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E4E3F2] px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-[#332C63] dark:text-slate-200"
        }
      >
        <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
        Reschedule
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 rounded-xl border border-[#E4E3F2] bg-[#FBFBFE] p-3 dark:border-[#332C63] dark:bg-[#1B1836]">
      {serverError && <p className="text-xs font-medium text-red-600">{serverError}</p>}
      <div className="flex flex-wrap gap-2">
        <input
          type="date"
          required
          min={new Date().toISOString().slice(0, 10)}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 rounded-lg border border-[#E4E3F2] px-2 text-xs text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <input
          type="time"
          required
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="h-9 rounded-lg border border-[#E4E3F2] px-2 text-xs text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!date || !time || reschedule.isPending}
          className="inline-flex h-8 items-center rounded-lg bg-primary-600 px-3 text-xs font-bold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {reschedule.isPending ? "Saving…" : "Propose new time"}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="inline-flex h-8 items-center rounded-lg border border-[#E4E3F2] px-3 text-xs font-bold text-slate-700 hover:bg-white dark:border-[#332C63] dark:text-slate-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default RescheduleBookingButton;
