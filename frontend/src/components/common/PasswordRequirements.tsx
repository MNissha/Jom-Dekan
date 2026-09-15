import { Check, X } from 'lucide-react';

export const PASSWORD_REQUIREMENTS: { label: string; test: (value: string) => boolean }[] = [
  { label: '8 characters', test: (value) => value.length >= 8 },
  { label: 'At least 1 uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { label: 'At least 1 number', test: (value) => /[0-9]/.test(value) },
  { label: 'At least 1 special character', test: (value) => /[^A-Za-z0-9]/.test(value) },
];

function PasswordRequirementItem({ met, label }: { met: boolean; label: string }) {
  return (
    <li
      className={`flex items-center gap-1.5 transition-colors duration-200 ${
        met ? 'text-emerald-600' : 'text-red-500'
      }`}
    >
      {met ? (
        <Check className="h-3.5 w-3.5 shrink-0 transition-transform duration-200" />
      ) : (
        <X className="h-3.5 w-3.5 shrink-0 transition-transform duration-200" />
      )}
      {label}
    </li>
  );
}

// Live-updating password strength checklist shared by every screen that
// sets a password (register, reset) — keeps the rules and styling from
// drifting apart between them.
export function PasswordRequirementsChecklist({ password, id }: { password: string; id?: string }) {
  return (
    <ul id={id} className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
      {PASSWORD_REQUIREMENTS.map((requirement) => (
        <PasswordRequirementItem key={requirement.label} label={requirement.label} met={requirement.test(password)} />
      ))}
    </ul>
  );
}
