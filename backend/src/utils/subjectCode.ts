/**
 * Collapses the ways students type the same subject code — "CSC 577",
 * "CSC-577", "csc577" — down to one canonical form ("CSC577") so the
 * find-or-create lookup in taxonomyService treats them as the same
 * subject instead of spawning duplicates.
 */
export function normalizeSubjectCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
