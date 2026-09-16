import { Link } from "react-router-dom";
import { Upload, HelpCircle, Users, Briefcase } from "lucide-react";
import { cardClassName, SkeletonBlock } from "../common/cards";

const actions = [
  {
    to: "/resources/upload",
    label: "Upload a resource",
    subtitle: "Share notes or papers",
    icon: Upload,
    iconClass: "bg-[#EFEEFB] text-[#4338CA]",
  },
  {
    to: "/forum",
    label: "Ask a question",
    subtitle: "Post to the discussion forum",
    icon: HelpCircle,
    iconClass: "bg-[#FDF3DA] text-[#8A6A00]",
  },
  {
    to: "/marketplace?type=TUTORING",
    label: "Find a tutor",
    subtitle: "Verified, moderated tutoring",
    icon: Users,
    iconClass: "bg-[#E4F1FB] text-[#1D5E8A]",
  },
  {
    // Honest subtitle: no fabricated "opens at" schedule — the
    // marketplace has no posting-window/availability data, so unlike the
    // reference's sample text, this only describes what's actually there.
    to: "/marketplace",
    label: "Freelance board",
    subtitle: "Browse freelance & project listings",
    icon: Briefcase,
    iconClass: "bg-[#F1F0FA] text-[#8A88A5]",
  },
];

function QuickActionSkeleton() {
  return (
    <div className={cardClassName("static", "flex h-full flex-col gap-3")} aria-hidden="true">
      <SkeletonBlock className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="space-y-2">
        <SkeletonBlock className="h-3.5 w-3/4" />
        <SkeletonBlock className="h-3 w-full" />
      </div>
    </div>
  );
}

export function QuickActions({ forceLoading = false }: { forceLoading?: boolean }) {
  return (
    <div className={cardClassName("static")} aria-busy={forceLoading}>
      <h2 className="font-semibold text-slate-800">Quick actions</h2>
      <p className="mt-0.5 text-sm text-slate-500">Contribute, ask, or earn — in one tap</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {forceLoading
          ? Array.from({ length: 4 }).map((_, i) => <QuickActionSkeleton key={i} />)
          : actions.map(({ to, label, subtitle, icon: Icon, iconClass }, i) => (
              <Link
                key={to}
                to={to}
                style={{ animationDelay: `${i * 60}ms` }}
                className={cardClassName("interactive", "flex h-full flex-col gap-3 motion-safe:animate-[fadeIn_350ms_ease-out_both]")}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800">{label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{subtitle}</span>
                </span>
              </Link>
            ))}
      </div>
    </div>
  );
}
