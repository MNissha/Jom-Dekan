import { createRef } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AiSummarySection } from "../src/components/resource/AiSummarySection";
import { resourceSummaryService } from "../src/service/resourceSummaryService";
import type { ResourceSummaryView } from "../src/types/resourceSummary";

vi.mock("../src/service/resourceSummaryService", () => ({
  resourceSummaryService: {
    getSummary: vi.fn(),
    generateSummary: vi.fn(),
    downloadSummary: vi.fn(),
  },
}));

const mockGetSummary = vi.mocked(resourceSummaryService.getSummary);
const mockGenerateSummary = vi.mocked(resourceSummaryService.generateSummary);
const mockDownloadSummary = vi.mocked(resourceSummaryService.downloadSummary);

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

/** Renders AiSummarySection with the panel-related props it now requires
 * (onOpenAgent/isAgentOpen/launcherButtonRef) filled with harmless
 * defaults, so every existing summary-only test doesn't have to restate
 * them. Tests that care about the "Ask AI" button pass their own onOpenAgent. */
function renderSection(overrides: Partial<Parameters<typeof AiSummarySection>[0]> = {}) {
  const onOpenAgent = overrides.onOpenAgent ?? vi.fn();
  const launcherButtonRef = overrides.launcherButtonRef ?? createRef<HTMLButtonElement>();
  return renderWithClient(
    <AiSummarySection
      resourceId="r1"
      resourceTitle="My Resource"
      onOpenAgent={onOpenAgent}
      isAgentOpen={false}
      launcherButtonRef={launcherButtonRef}
      {...overrides}
    />,
  );
}

function baseView(overrides: Partial<ResourceSummaryView> = {}): ResourceSummaryView {
  return {
    status: "NOT_GENERATED",
    sourceType: "TEXT_RESOURCE",
    summary: null,
    model: null,
    errorCode: null,
    errorMessage: null,
    generatedAt: null,
    updatedAt: null,
    ...overrides,
  };
}

const READY_VIEW: ResourceSummaryView = baseView({
  status: "READY",
  model: "gpt-5.6-luna",
  generatedAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  summary: {
    overview: "An overview of the resource.",
    keyPoints: ["Point one"],
    studySections: [{ heading: "Section A", content: "Content for section A." }],
    topics: ["Topic A"],
    glossary: [{ term: "Term A", definition: "Definition of term A." }],
    limitations: ["A limitation applies."],
    language: "English",
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
  window.URL.revokeObjectURL = vi.fn();
});

describe("AiSummarySection", () => {
  it("shows a retryable error (not a blank body) when the initial GET fails", async () => {
    mockGetSummary.mockRejectedValue(new Error("network error"));
    renderSection();

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load the ai summary/i);
    const retryButton = screen.getByRole("button", { name: /try again/i });

    mockGetSummary.mockResolvedValueOnce(baseView());
    fireEvent.click(retryButton);
    expect(await screen.findByRole("button", { name: /generate ai summary/i })).toBeInTheDocument();
  });

  it("shows the NOT_GENERATED empty state with a Generate button and the disclaimer", async () => {
    mockGetSummary.mockResolvedValue(baseView());
    renderSection();

    expect(await screen.findByRole("button", { name: /generate ai summary/i })).toBeInTheDocument();
    expect(screen.getByText(/AI-generated study aid/i)).toBeInTheDocument();
  });

  it("shows the DISABLED state with no generate button", async () => {
    mockGetSummary.mockResolvedValue(baseView({ status: "DISABLED" }));
    renderSection();

    expect(await screen.findByText(/currently disabled/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate ai summary/i })).not.toBeInTheDocument();
  });

  it("disables the Generate button while a generation is in flight and prevents a second submission", async () => {
    mockGetSummary.mockResolvedValue(baseView());
    let resolveGenerate!: (value: ResourceSummaryView) => void;
    mockGenerateSummary.mockReturnValue(
      new Promise<ResourceSummaryView>((resolve) => {
        resolveGenerate = resolve;
      }),
    );
    renderSection();

    const button = await screen.findByRole("button", { name: /generate ai summary/i });
    fireEvent.click(button);

    const generatingButton = await screen.findByRole("button", { name: /generating/i });
    expect(generatingButton).toBeDisabled();

    // A second click while disabled must not trigger a second call.
    fireEvent.click(generatingButton);
    expect(mockGenerateSummary).toHaveBeenCalledTimes(1);

    resolveGenerate(READY_VIEW);
    await waitFor(() => expect(screen.getByText(READY_VIEW.summary!.overview)).toBeInTheDocument());
  });

  it("renders overview, key points, study sections, topics, glossary, limitations and the disclaimer when READY", async () => {
    mockGetSummary.mockResolvedValue(READY_VIEW);
    renderSection();

    expect(await screen.findByText(READY_VIEW.summary!.overview)).toBeInTheDocument();
    expect(screen.getByText("Point one")).toBeInTheDocument();
    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText("Topic A")).toBeInTheDocument();
    expect(screen.getByText("Term A")).toBeInTheDocument();
    expect(screen.getByText(/A limitation applies\./)).toBeInTheDocument();
    expect(screen.getByText(/AI-generated study aid/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download pdf/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download word/i })).toBeInTheDocument();
  });

  it("shows a FAILED state with the error message and a Retry button", async () => {
    mockGetSummary.mockResolvedValue(
      baseView({
        status: "FAILED",
        errorCode: "AI_SUMMARY_GENERATION_FAILED",
        errorMessage: "We couldn't generate a summary right now. Please try again in a moment.",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    renderSection();

    expect(await screen.findByText(/couldn't generate a summary right now/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^retry$/i })).toBeInTheDocument();
  });

  it("shows an UNSUPPORTED message without a generate button", async () => {
    mockGetSummary.mockResolvedValue(
      baseView({
        status: "UNSUPPORTED",
        sourceType: "EXTRACTED_DOCUMENT",
        errorCode: "UNSUPPORTED_MIME_TYPE",
        errorMessage: "AI summaries are not yet available for this file type.",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    renderSection();

    expect(await screen.findByText(/not yet available for this file type/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /generate ai summary/i })).not.toBeInTheDocument();
  });

  it("downloads a PDF via the authenticated service and shows a downloading state only on that button", async () => {
    mockGetSummary.mockResolvedValue(READY_VIEW);
    let resolveDownload!: (value: Blob) => void;
    mockDownloadSummary.mockReturnValue(
      new Promise<Blob>((resolve) => {
        resolveDownload = resolve;
      }),
    );
    renderSection();

    const pdfButton = await screen.findByRole("button", { name: /download pdf/i });
    const wordButton = screen.getByRole("button", { name: /download word/i });
    fireEvent.click(pdfButton);

    await waitFor(() => expect(screen.getByRole("button", { name: /downloading/i })).toBeInTheDocument());
    // The Word button must not also claim to be downloading.
    expect(wordButton).toHaveTextContent(/download word/i);

    resolveDownload(new Blob(["fake pdf bytes"]));
    await waitFor(() => expect(mockDownloadSummary).toHaveBeenCalledWith("r1", "pdf", undefined));
  });

  it("has an accessible section heading and surfaces errors via role=alert", async () => {
    mockGetSummary.mockResolvedValue(baseView());
    mockGenerateSummary.mockRejectedValue(new Error("network error"));
    renderSection();

    expect(await screen.findByRole("heading", { name: /ai study summary/i })).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: /generate ai summary/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it("always shows a prominent 'Ask AI about this resource' button that opens the panel", async () => {
    mockGetSummary.mockResolvedValue(baseView());
    const onOpenAgent = vi.fn();
    renderSection({ onOpenAgent, isAgentOpen: false });

    const askButton = await screen.findByRole("button", { name: /ask ai about this resource/i });
    expect(askButton).toHaveAttribute("aria-expanded", "false");
    expect(askButton).toHaveAttribute("aria-controls", "resource-agent-panel");

    fireEvent.click(askButton);
    expect(onOpenAgent).toHaveBeenCalledTimes(1);
  });

  it("reflects isAgentOpen on the launcher button's aria-expanded", async () => {
    mockGetSummary.mockResolvedValue(baseView());
    renderSection({ isAgentOpen: true });

    expect(await screen.findByRole("button", { name: /ask ai about this resource/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("keeps the AI Summary card on the page independent of the agent panel", async () => {
    mockGetSummary.mockResolvedValue(READY_VIEW);
    renderSection();

    // The summary heading and content render regardless of the panel —
    // this component never renders the agent conversation itself.
    expect(await screen.findByText(READY_VIEW.summary!.overview)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ai study summary/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  describe("multi-file AI source selection", () => {
    const MULTI_SOURCE_VIEW = baseView({
      selectedSource: { resourceFileId: "pdf-1", filename: "Lecture Notes.pdf", fileType: "PDF", supported: true },
      availableSources: [
        { resourceFileId: "pdf-1", filename: "Lecture Notes.pdf", fileType: "PDF", supported: true, recommended: true },
        { resourceFileId: "docx-1", filename: "Tutorial Answers.docx", fileType: "DOCX", supported: true, recommended: false },
      ],
    });

    it("shows the AI source selector only when there is more than one available source", async () => {
      mockGetSummary.mockResolvedValue(MULTI_SOURCE_VIEW);
      renderSection();

      expect(await screen.findByRole("radiogroup", { name: /ai analysis source/i })).toBeInTheDocument();
      expect(screen.getByText(/ai is using: lecture notes\.pdf/i)).toBeInTheDocument();
    });

    it("does not show the selector for a single-file resource, but shows which file is being analyzed", async () => {
      mockGetSummary.mockResolvedValue(
        baseView({
          selectedSource: { resourceFileId: "pdf-1", filename: "Only File.pdf", fileType: "PDF", supported: true },
          availableSources: [{ resourceFileId: "pdf-1", filename: "Only File.pdf", fileType: "PDF", supported: true, recommended: true }],
        }),
      );
      renderSection();

      expect(await screen.findByText(/ai is using: only file\.pdf/i)).toBeInTheDocument();
      expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    });

    it("selecting a different source calls onSelectFileId without generating a summary", async () => {
      mockGetSummary.mockResolvedValue(MULTI_SOURCE_VIEW);
      const onSelectFileId = vi.fn();
      renderSection({ onSelectFileId });

      const docxRadio = await screen.findByRole("radio", { name: /tutorial answers\.docx/i });
      fireEvent.click(docxRadio);

      expect(onSelectFileId).toHaveBeenCalledWith("docx-1");
      expect(mockGenerateSummary).not.toHaveBeenCalled();
    });

    it("passes the selected resourceFileId through to the summary query", async () => {
      mockGetSummary.mockResolvedValue(MULTI_SOURCE_VIEW);
      renderSection({ resourceFileId: "docx-1" });

      await screen.findByText(/ai is using: lecture notes\.pdf/i); // mocked response always returns pdf-1's view
      expect(mockGetSummary).toHaveBeenCalledWith("r1", "docx-1");
    });
  });
});
