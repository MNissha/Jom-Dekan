import { Check, X } from 'lucide-react';

const PASSWORD_REQUIREMENTS: { label: string; test: (value: string) => boolean }[] = [
  { label: '8 characters', test: (value) => value.length >= 8 },
  { label: 'At least 1 uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { label: 'At least 1 number', test: (value) => /[0-9]/.test(value) },
  { label: 'At least 1 special character', test: (value) => /[^A-Za-z0-9]/.test(value) },
];

function PasswordRequirementItem({ met, label }: { met: boolean; label: string }) {
  return (
    <li
      className={`flex min-h-7 items-center gap-2.5 font-medium transition-colors duration-200 ${
        met ? 'text-emerald-700' : 'text-red-600'
      }`}
    >
      <span
        aria-hidden="true"
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-white shadow-sm transition-all duration-200 motion-safe:group-focus-within:scale-105 ${
          met ? 'bg-emerald-500 motion-safe:animate-[passwordCheck_220ms_ease-out]' : 'bg-red-500'
        }`}
      >
        {met ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <X className="h-3.5 w-3.5 stroke-[3]" />}
      </span>
      <span>{label}</span>
      <span className="sr-only">: {met ? 'requirement met' : 'requirement not met'}</span>
    </li>
  );
}

// Live-updating password strength checklist shared by every screen that
// sets a password (register, reset) — keeps the rules and styling from
// drifting apart between them.
export function PasswordRequirementsChecklist({ password, id }: { password: string; id?: string }) {
  return (
    <div className="group mt-3 rounded-xl border border-[#E5E2F5] bg-[#FBFAFF] px-3.5 py-3 shadow-sm transition-colors duration-200 focus-within:border-primary-300">
      <p className="mb-1.5 text-xs font-semibold text-slate-600">Your password must include:</p>
      <ul id={id} className="space-y-1 text-sm" aria-label="Password requirements" aria-live="polite">
        {PASSWORD_REQUIREMENTS.map((requirement) => (
          <PasswordRequirementItem key={requirement.label} label={requirement.label} met={requirement.test(password)} />
        ))}
      </ul>
    </div>
  );
}
