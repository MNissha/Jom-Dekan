import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ResourceFileList } from "../src/components/resource/ResourceFileList";
import { resourceService } from "../src/service/resourceService";
import type { ResourceFile } from "../src/types/resource";

vi.mock("../src/service/resourceService", () => ({
  resourceService: {
    getDownloadUrl: vi.fn(),
  },
}));

const mockGetDownloadUrl = vi.mocked(resourceService.getDownloadUrl);

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function file(overrides: Partial<ResourceFile> = {}): ResourceFile {
  return {
    id: "f1",
    resourceId: "r1",
    originalFilename: "Lecture Notes.pdf",
    declaredMimeType: "application/pdf",
    detectedMimeType: "application/pdf",
    sizeBytes: 2_400_000,
    status: "READY",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.open = vi.fn();
});

describe("ResourceFileList", () => {
  it("renders nothing when there are no READY files", () => {
    renderWithClient(<ResourceFileList files={[file({ status: "PENDING" })]} />);
    expect(screen.queryByText(/files in this resource/i)).not.toBeInTheDocument();
  });

  it("lists every READY file with its type, size, and a download button, skipping non-READY files", async () => {
    renderWithClient(
      <ResourceFileList
        files={[
          file({ id: "f1", originalFilename: "Lecture Notes.pdf" }),
          file({
            id: "f2",
            originalFilename: "Tutorial Answers.docx",
            detectedMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            sizeBytes: 800_000,
          }),
          file({ id: "f3", originalFilename: "still-uploading.png", status: "PENDING" }),
        ]}
      />,
    );

    expect(screen.getByText(/files in this resource/i)).toBeInTheDocument();
    expect(screen.getByText("Lecture Notes.pdf")).toBeInTheDocument();
    expect(screen.getByText("Tutorial Answers.docx")).toBeInTheDocument();
    expect(screen.queryByText("still-uploading.png")).not.toBeInTheDocument();
    expect(screen.getByText(/PDF · 2\.3 MB/)).toBeInTheDocument();
    expect(screen.getByText(/DOCX · 781(\.\d)? KB|DOCX · 800 KB/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /download/i })).toHaveLength(2);
  });

  it("downloads the correct file and prevents repeated clicks while preparing", async () => {
    let resolveUrl!: (value: string) => void;
    mockGetDownloadUrl.mockReturnValue(
      new Promise((resolve) => {
        resolveUrl = resolve;
      }),
    );

    renderWithClient(<ResourceFileList files={[file()]} />);
    const button = screen.getByRole("button", { name: /download lecture notes\.pdf/i });
    fireEvent.click(button);

    const preparingButton = await screen.findByRole("button", { name: /preparing download of lecture notes\.pdf/i });
    expect(preparingButton).toBeDisabled();
    fireEvent.click(preparingButton); // second click while pending must not fire another request
    expect(mockGetDownloadUrl).toHaveBeenCalledTimes(1);

    resolveUrl("https://signed.example/download");
    await waitFor(() => expect(window.open).toHaveBeenCalledWith("https://signed.example/download", "_blank", "noopener,noreferrer"));
  });
});
