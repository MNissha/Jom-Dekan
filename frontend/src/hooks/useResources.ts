import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resourceService } from "../service/resourceService";
import type { ResourceCategory } from "../types/resource";

export function useResources(params: {
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
}) {
  return useQuery({
    queryKey: ["resources", params],
    queryFn: () => resourceService.list(params),
  });
}

export function useResource(id: string | undefined) {
  return useQuery({
    queryKey: ["resources", "detail", id],
    queryFn: () => resourceService.getById(id!),
    enabled: Boolean(id),
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { title: string; description?: string };
    }) => resourceService.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["resources"] }),
  });
}

export function useSetResourceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: "ARCHIVE" | "RESTORE";
    }) => resourceService.setStatus(id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["resources"] }),
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resourceService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["resources"] }),
  });
}

export function useDownloadUrl() {
  return useMutation({
    mutationFn: (fileId: string) => resourceService.getDownloadUrl(fileId),
  });
}

/**
 * Auto-fetches a signed preview URL for a file (image or PDF) as soon
 * as the page has one to show — used for both the inline <img> preview
 * and the PDF-page-1 thumbnail render. Separate from useDownloadUrl (a
 * mutation) because the Download button wants a fresh token fetched
 * right when clicked, not one that might have sat around since page
 * load — this one is fine to go a little stale since a failed preview
 * just means "no preview", not a broken download.
 */
export function useFilePreviewUrl(fileId: string | undefined) {
  return useQuery({
    queryKey: ["resources", "preview-url", fileId],
    queryFn: () => resourceService.getDownloadUrl(fileId!),
    enabled: Boolean(fileId),
    staleTime: 4 * 60 * 1000,
  });
}

export function useResourceComments(resourceId: string | undefined) {
  return useQuery({
    queryKey: ["resources", "comments", resourceId],
    queryFn: () => resourceService.listComments(resourceId!),
    enabled: Boolean(resourceId),
  });
}

export function useCreateResourceComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resourceId, body }: { resourceId: string; body: string }) =>
      resourceService.createComment(resourceId, body),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["resources", "comments", variables.resourceId],
      }),
  });
}

export function useUpdateResourceComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      commentId,
      body,
      resourceId,
    }: {
      commentId: string;
      body: string;
      resourceId: string;
    }) => {
      void resourceId;
      return resourceService.updateComment(commentId, body);
    },
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["resources", "comments", variables.resourceId],
      }),
  });
}

export function useDeleteResourceComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      commentId,
      resourceId,
    }: {
      commentId: string;
      resourceId: string;
    }) => {
      void resourceId;
      return resourceService.removeComment(commentId);
    },
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({
        queryKey: ["resources", "comments", variables.resourceId],
      }),
  });
}

interface UploadResourceInput {
  title: string;
  description?: string;
  category: ResourceCategory;
  universityId?: string;
  facultyId?: string;
  programmeId?: string;
  subjectId?: string;
  // Set instead of subjectId when the uploader is naming a subject that
  // isn't in the catalogue yet — only meaningful on the file-upload path
  // below (createTextResource doesn't accept these).
  subjectCode?: string;
  subjectName?: string;
  subjectSemester?: number;
  subjectCurriculumYear?: number;
  // Optional: with no file, `description` becomes the resource's actual
  // content instead of just a caption — see createTextResourceSchema.
  file?: File;
  onProgress?: (percent: number) => void;
}

/**
 * With a file: chains upload-intent -> PUT file (with progress) ->
 * confirm, in one mutation. With no file: posts straight to the
 * text-only endpoint, published READY immediately (no pipeline to run).
 */
export function useUploadResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadResourceInput) => {
      if (!input.file) {
        return resourceService.createTextResource({
          title: input.title,
          description: input.description ?? "",
          category: input.category,
          universityId: input.universityId,
          facultyId: input.facultyId,
          programmeId: input.programmeId,
          subjectId: input.subjectId,
        });
      }

      const intent = await resourceService.createUploadIntent({
        title: input.title,
        description: input.description,
        category: input.category,
        universityId: input.universityId,
        facultyId: input.facultyId,
        programmeId: input.programmeId,
        subjectId: input.subjectId,
        subjectCode: input.subjectCode,
        subjectName: input.subjectName,
        subjectSemester: input.subjectSemester,
        subjectCurriculumYear: input.subjectCurriculumYear,
        fileName: input.file.name,
        contentType: input.file.type,
        sizeBytes: input.file.size,
      });
      await resourceService.uploadFile(
        intent.uploadUrl,
        input.file,
        input.onProgress,
      );
      return resourceService.confirmUpload(intent.file.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      // A new subject may have just been created inline — refresh the
      // catalogue so it shows up the next time someone opens the picker.
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
}
