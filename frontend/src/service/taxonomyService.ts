import axiosInstance from "../api/axiosInstance";
import type {
  University,
  Faculty,
  Programme,
  Subject,
  TaxonomyRequest,
} from "../types/taxonomy";

export const taxonomyService = {
  listUniversities: async (): Promise<University[]> => {
    const res = await axiosInstance.get<{ data: University[] }>(
      "/taxonomy/universities",
    );
    return res.data.data;
  },
  createUniversity: async (data: {
    name: string;
    country?: string;
  }): Promise<University> => {
    const res = await axiosInstance.post<{ data: University }>(
      "/taxonomy/universities",
      data,
    );
    return res.data.data;
  },
  updateUniversity: async (
    id: string,
    data: { name: string; country?: string },
  ): Promise<University> => {
    const res = await axiosInstance.put<{ data: University }>(
      `/taxonomy/universities/${id}`,
      data,
    );
    return res.data.data;
  },
  setUniversityStatus: async (
    id: string,
    isActive: boolean,
  ): Promise<University> => {
    const res = await axiosInstance.patch<{ data: University }>(
      `/taxonomy/universities/${id}/status`,
      { isActive },
    );
    return res.data.data;
  },
  deleteUniversity: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/taxonomy/universities/${id}`);
  },

  listFaculties: async (universityId: string): Promise<Faculty[]> => {
    const res = await axiosInstance.get<{ data: Faculty[] }>(
      "/taxonomy/faculties",
      { params: { universityId } },
    );
    return res.data.data;
  },
  createFaculty: async (data: {
    universityId: string;
    name: string;
  }): Promise<Faculty> => {
    const res = await axiosInstance.post<{ data: Faculty }>(
      "/taxonomy/faculties",
      data,
    );
    return res.data.data;
  },
  updateFaculty: async (
    id: string,
    data: { name: string },
  ): Promise<Faculty> => {
    const res = await axiosInstance.put<{ data: Faculty }>(
      `/taxonomy/faculties/${id}`,
      data,
    );
    return res.data.data;
  },
  setFacultyStatus: async (id: string, isActive: boolean): Promise<Faculty> => {
    const res = await axiosInstance.patch<{ data: Faculty }>(
      `/taxonomy/faculties/${id}/status`,
      { isActive },
    );
    return res.data.data;
  },
  deleteFaculty: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/taxonomy/faculties/${id}`);
  },

  listProgrammes: async (facultyId: string): Promise<Programme[]> => {
    const res = await axiosInstance.get<{ data: Programme[] }>(
      "/taxonomy/programmes",
      { params: { facultyId } },
    );
    return res.data.data;
  },
  createProgramme: async (data: {
    facultyId: string;
    name: string;
    studyLevel?: string;
  }): Promise<Programme> => {
    const res = await axiosInstance.post<{ data: Programme }>(
      "/taxonomy/programmes",
      data,
    );
    return res.data.data;
  },
  updateProgramme: async (
    id: string,
    data: { name: string; studyLevel?: string },
  ): Promise<Programme> => {
    const res = await axiosInstance.put<{ data: Programme }>(
      `/taxonomy/programmes/${id}`,
      data,
    );
    return res.data.data;
  },
  setProgrammeStatus: async (
    id: string,
    isActive: boolean,
  ): Promise<Programme> => {
    const res = await axiosInstance.patch<{ data: Programme }>(
      `/taxonomy/programmes/${id}/status`,
      { isActive },
    );
    return res.data.data;
  },
  deleteProgramme: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/taxonomy/programmes/${id}`);
  },

  listSubjects: async (programmeId?: string): Promise<Subject[]> => {
    const res = await axiosInstance.get<{ data: Subject[] }>(
      "/taxonomy/subjects",
      { params: programmeId ? { programmeId } : undefined },
    );
    return res.data.data;
  },
  createSubject: async (data: {
    code: string;
    name: string;
  }): Promise<Subject> => {
    const res = await axiosInstance.post<{ data: Subject }>(
      "/taxonomy/subjects",
      data,
    );
    return res.data.data;
  },
  updateSubject: async (
    id: string,
    data: { name: string },
  ): Promise<Subject> => {
    const res = await axiosInstance.put<{ data: Subject }>(
      `/taxonomy/subjects/${id}`,
      data,
    );
    return res.data.data;
  },
  setSubjectStatus: async (id: string, isActive: boolean): Promise<Subject> => {
    const res = await axiosInstance.patch<{ data: Subject }>(
      `/taxonomy/subjects/${id}/status`,
      { isActive },
    );
    return res.data.data;
  },
  deleteSubject: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/taxonomy/subjects/${id}`);
  },

  linkSubjectToProgramme: async (
    programmeId: string,
    data: { subjectId: string; curriculumYear?: number },
  ): Promise<Subject[]> => {
    const res = await axiosInstance.post<{ data: Subject[] }>(
      `/taxonomy/programmes/${programmeId}/subjects`,
      data,
    );
    return res.data.data;
  },
  unlinkSubjectFromProgramme: async (
    programmeId: string,
    subjectId: string,
  ): Promise<Subject[]> => {
    const res = await axiosInstance.delete<{ data: Subject[] }>(
      `/taxonomy/programmes/${programmeId}/subjects/${subjectId}`,
    );
    return res.data.data;
  },

  createTaxonomyRequest: async (data: {
    universityId?: string;
    requestedUniversityName?: string;
    facultyId?: string;
    requestedFacultyName?: string;
    programmeId?: string;
    requestedProgrammeName?: string;
    requestedSubjectCode?: string;
    requestedSubjectName?: string;
    note?: string;
  }): Promise<TaxonomyRequest> => {
    const res = await axiosInstance.post<{ data: TaxonomyRequest }>(
      "/taxonomy/requests",
      data,
    );
    return res.data.data;
  },
  listMyTaxonomyRequests: async (): Promise<TaxonomyRequest[]> => {
    const res = await axiosInstance.get<{ data: TaxonomyRequest[] }>(
      "/taxonomy/requests/mine",
    );
    return res.data.data;
  },
  listPendingTaxonomyRequests: async (): Promise<TaxonomyRequest[]> => {
    const res = await axiosInstance.get<{ data: TaxonomyRequest[] }>(
      "/taxonomy/requests/pending",
    );
    return res.data.data;
  },
  reviewTaxonomyRequest: async (
    id: string,
    decision: "APPROVED" | "REJECTED",
  ): Promise<TaxonomyRequest> => {
    const res = await axiosInstance.patch<{ data: TaxonomyRequest }>(
      `/taxonomy/requests/${id}/review`,
      { decision },
    );
    return res.data.data;
  },
};
