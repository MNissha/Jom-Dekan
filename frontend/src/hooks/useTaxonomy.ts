import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taxonomyService } from "../service/taxonomyService";

export function useUniversities() {
  return useQuery({
    queryKey: ["universities"],
    queryFn: taxonomyService.listUniversities,
  });
}

export function useFaculties(universityId: string | undefined) {
  return useQuery({
    queryKey: ["faculties", universityId],
    queryFn: () => taxonomyService.listFaculties(universityId!),
    enabled: Boolean(universityId),
  });
}

export function useProgrammes(facultyId: string | undefined) {
  return useQuery({
    queryKey: ["programmes", facultyId],
    queryFn: () => taxonomyService.listProgrammes(facultyId!),
    enabled: Boolean(facultyId),
  });
}

// Pass a programmeId to scope the list to subjects linked to that
// programme (e.g. Upload Resource); omit it for the full catalogue (e.g.
// the admin Subjects page).
export function useSubjects(programmeId?: string) {
  return useQuery({
    queryKey: ["subjects", programmeId ?? "all"],
    queryFn: () => taxonomyService.listSubjects(programmeId),
  });
}

// ---- Universities ----
export function useCreateUniversity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taxonomyService.createUniversity,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["universities"] }),
  });
}

export function useUpdateUniversity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name: string; country?: string };
    }) => taxonomyService.updateUniversity(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["universities"] }),
  });
}

export function useSetUniversityStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      taxonomyService.setUniversityStatus(id, isActive),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["universities"] }),
  });
}

// ---- Faculties ----
export function useCreateFaculty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taxonomyService.createFaculty,
    // Broad invalidation on purpose: TanStack Query matches ['faculties']
    // against every ['faculties', universityId] query, so every open
    // faculty list refetches regardless of which university it belongs to.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["faculties"] }),
  });
}

export function useUpdateFaculty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) =>
      taxonomyService.updateFaculty(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["faculties"] }),
  });
}

export function useSetFacultyStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      taxonomyService.setFacultyStatus(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["faculties"] }),
  });
}

// ---- Programmes ----
export function useCreateProgramme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taxonomyService.createProgramme,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["programmes"] }),
  });
}

export function useUpdateProgramme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name: string; studyLevel?: string };
    }) => taxonomyService.updateProgramme(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["programmes"] }),
  });
}

export function useSetProgrammeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      taxonomyService.setProgrammeStatus(id, isActive),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["programmes"] }),
  });
}

// ---- Subjects ----
export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taxonomyService.createSubject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subjects"] }),
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) =>
      taxonomyService.updateSubject(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subjects"] }),
  });
}

export function useSetSubjectStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      taxonomyService.setSubjectStatus(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subjects"] }),
  });
}

// ---- Programme <-> Subject links ----
export function useLinkSubjectToProgramme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      programmeId,
      subjectId,
      curriculumYear,
    }: {
      programmeId: string;
      subjectId: string;
      curriculumYear?: number;
    }) =>
      taxonomyService.linkSubjectToProgramme(programmeId, {
        subjectId,
        curriculumYear,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subjects"] }),
  });
}

export function useUnlinkSubjectFromProgramme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      programmeId,
      subjectId,
    }: {
      programmeId: string;
      subjectId: string;
    }) => taxonomyService.unlinkSubjectFromProgramme(programmeId, subjectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subjects"] }),
  });
}

// ---- Taxonomy requests ("can't find your university/programme?") ----
export function useCreateTaxonomyRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: taxonomyService.createTaxonomyRequest,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["taxonomyRequests", "mine"] }),
  });
}

export function useMyTaxonomyRequests() {
  return useQuery({
    queryKey: ["taxonomyRequests", "mine"],
    queryFn: taxonomyService.listMyTaxonomyRequests,
  });
}
