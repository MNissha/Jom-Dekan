// Shared text-input styling for auth/profile forms so the red "invalid
// field" outline stays consistent everywhere instead of being retyped
// per form.
export function fieldClassName(hasError: boolean): string {
  return `mt-1 w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none focus:ring-2 ${
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
      : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500'
  }`;
}
