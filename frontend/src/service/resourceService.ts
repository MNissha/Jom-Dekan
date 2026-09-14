import axiosInstance from "../api/axiosInstance";
import type {
  Resource,
  ResourceCategory,
  ResourceFile,
  ResourceComment,
  ResourceListItem,
  ResourceListMeta,
} from "../types/resource";

/**
 * The backend returns upload/download URLs as a path already prefixed
 * with "/api/v1" (e.g. "/api/v1/resources/files/download?token=...").
 * axiosInstance's baseURL already ends in "/api/v1", so passing that
 * path straight through would double it up. Both call sites below need
 * a fully-qualified URL anyway — the upload PUT so axios treats it as
 * absolute (skipping baseURL entirely), and the download link because
 * it's opened directly as a bare link, on the backend's origin, not
 * resolved relative to the frontend's own origin/port.
 */
function toAbsoluteApiUrl(path: string): string {
  const base = axiosInstance.defaults.baseURL ?? "";
  const origin = new URL(base, window.location.origin).origin;
  return new URL(path, origin).toString();
}

function optionalId(value: string | undefined) {
  return value || undefined;
}

interface UploadIntentInput {
  title: string;
  description?: string;
  category: ResourceCategory;
  universityId?: string;
  facultyId?: string;
  programmeId?: string;
  subjectId?: string;
  // Set instead of subjectId when the uploader typed a subject that
  // isn't in the catalogue yet — the backend resolves/creates it as
  // part of this same request. See UploadResource's "add a new subject"
  // toggle.
  subjectCode?: string;
  subjectName?: string;
  subjectSemester?: number;
  subjectCurriculumYear?: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

interface UploadIntentResult {
  resource: Resource;
  file: ResourceFile;
  uploadUrl: string;
}

interface CreateTextResourceInput {
  title: string;
  description: string;
  category: ResourceCategory;
  universityId?: string;
  facultyId?: string;
  programmeId?: string;
  subjectId?: string;
}

interface ListResourcesParams {
  mine?: boolean;
  universityId?: string;
  facultyId?: string;
  programmeId?: string;
  subjectId?: string;
  category?: ResourceCategory;
  q?: string;
  sortBy?: "newest" | "oldest" | "title";
  page?: number;
  pageSize?: number;
}

export const resourceService = {
  createUploadIntent: async (
    data: UploadIntentInput,
  ): Promise<UploadIntentResult> => {
    const res = await axiosInstance.post<{ data: UploadIntentResult }>(
      "/resources/upload-intent",
      {
        ...data,
        universityId: optionalId(data.universityId),
        facultyId: optionalId(data.facultyId),
        programmeId: optionalId(data.programmeId),
        subjectId: optionalId(data.subjectId),
        subjectCode: data.subjectCode || undefined,
        subjectName: data.subjectName || undefined,
        subjectSemester: data.subjectSemester,
        subjectCurriculumYear: data.subjectCurriculumYear,
      },
    );
    return res.data.data;
  },

  uploadFile: async (
    uploadUrl: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<ResourceFile> => {
    const formData = new FormData();
    formData.append("file", file);
    // Override the instance's default JSON header so the browser sets
    // the multipart boundary itself; the auth interceptor still runs.
    const res = await axiosInstance.put<{ data: ResourceFile }>(
      toAbsoluteApiUrl(uploadUrl),
      formData,
      {
        headers: { "Content-Type": undefined },
        onUploadProgress: (event) => {
          if (onProgress && event.total) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        },
      },
    );
    return res.data.data;
  },

  createTextResource: async (
    data: CreateTextResourceInput,
  ): Promise<{ resource: Resource }> => {
    const res = await axiosInstance.post<{ data: { resource: Resource } }>(
      "/resources/text",
      {
        ...data,
        universityId: optionalId(data.universityId),
        facultyId: optionalId(data.facultyId),
        programmeId: optionalId(data.programmeId),
        subjectId: optionalId(data.subjectId),
      },
    );
    return res.data.data;
  },

  confirmUpload: async (
    fileId: string,
  ): Promise<{ resource: Resource; file: ResourceFile }> => {
    const res = await axiosInstance.post<{
      data: { resource: Resource; file: ResourceFile };
    }>(`/resources/files/${fileId}/confirm`);
    return res.data.data;
  },

  list: async (
    params: ListResourcesParams,
  ): Promise<{ data: ResourceListItem[]; meta: ResourceListMeta }> => {
    const res = await axiosInstance.get<{
      data: ResourceListItem[];
      meta: ResourceListMeta;
    }>("/resources", {
      params,
    });
    return res.data;
  },

  getById: async (
    id: string,
  ): Promise<{ resource: ResourceListItem; files: ResourceFile[] }> => {
    const res = await axiosInstance.get<{
      data: { resource: ResourceListItem; files: ResourceFile[] };
    }>(`/resources/${id}`);
    return res.data.data;
  },

  listComments: async (resourceId: string): Promise<ResourceComment[]> => {
    const res = await axiosInstance.get<{ data: ResourceComment[] }>(
      `/resources/${resourceId}/comments`,
    );
    return res.data.data;
  },

  createComment: async (
    resourceId: string,
    body: string,
  ): Promise<ResourceComment> => {
    const res = await axiosInstance.post<{ data: ResourceComment }>(
      `/resources/${resourceId}/comments`,
      { body },
    );
    return res.data.data;
  },

  updateComment: async (
    commentId: string,
    body: string,
  ): Promise<ResourceComment> => {
    const res = await axiosInstance.put<{ data: ResourceComment }>(
      `/resources/comments/${commentId}`,
      { body },
    );
    return res.data.data;
  },

  removeComment: async (commentId: string): Promise<void> => {
    await axiosInstance.delete(`/resources/comments/${commentId}`);
  },

  update: async (
    id: string,
    data: { title: string; description?: string },
  ): Promise<Resource> => {
    const res = await axiosInstance.put<{ data: Resource }>(
      `/resources/${id}`,
      data,
    );
    return res.data.data;
  },

  setStatus: async (
    id: string,
    action: "ARCHIVE" | "RESTORE",
  ): Promise<Resource> => {
    const res = await axiosInstance.patch<{ data: Resource }>(
      `/resources/${id}/status`,
      { action },
    );
    return res.data.data;
  },

  remove: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/resources/${id}`);
  },

  getDownloadUrl: async (fileId: string): Promise<string> => {
    const res = await axiosInstance.get<{ data: { url: string } }>(
      `/resources/files/${fileId}/download-url`,
    );
    return toAbsoluteApiUrl(res.data.data.url);
  },
};
