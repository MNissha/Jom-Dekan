import { z } from "zod";

export const universityFormSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters.").max(200),
  country: z.string().trim().min(2).max(100).optional(),
});
export type UniversityFormValues = z.infer<typeof universityFormSchema>;

// Faculty/Programme/Subject forms follow the identical shape — copy this
// file's pattern, swapping the fields for whichever entity you're adding
// a page for (see AdminUniversities.tsx below for the full worked page).
export const facultyFormSchema = z.object({
  universityId: z.string().uuid("Choose a university."),
  name: z.string().trim().min(2, "Enter at least 2 characters.").max(200),
});
export type FacultyFormValues = z.infer<typeof facultyFormSchema>;

export const programmeFormSchema = z.object({
  facultyId: z.string().uuid("Choose a faculty."),
  name: z.string().trim().min(2, "Enter at least 2 characters.").max(200),
  studyLevel: z.enum(["DIPLOMA", "DEGREE", "MASTERS", "PHD"]).optional(),
});
export type ProgrammeFormValues = z.infer<typeof programmeFormSchema>;

export const subjectFormSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Enter at least 2 characters.")
    .max(20),
  name: z.string().trim().min(2, "Enter at least 2 characters.").max(200),
  // Optional: leave unset for a catalogue-wide subject (the historical
  // behavior), or scope it to one university — same code can then exist
  // for a different subject at a different university.
  universityId: z.string().uuid("Choose a university.").optional().or(z.literal("")),
});
export type SubjectFormValues = z.infer<typeof subjectFormSchema>;
