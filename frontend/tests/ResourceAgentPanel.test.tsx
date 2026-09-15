import { createRef, useState } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { ResourceAgentPanel } from "../src/components/resources/ResourceAgentPanel";
import { resourceAgentService } from "../src/service/resourceAgentService";
import { resourceSummaryService } from "../src/service/resourceSummaryService";
import type { AgentMessage, AgentMessagesResponse, AgentSessionResponse } from "../src/types/resourceAgent";

vi.mock("../src/service/resourceAgentService", () => ({
  resourceAgentService: {
    getOrCreateSession: vi.fn(),
    listMessages: vi.fn(),
    askQuestion: vi.fn(),
    clearSession: vi.fn(),
    getSuggestions: vi.fn(),
  },
}));

vi.mock("../src/service/resourceSummaryService", () => ({
  resourceSummaryService: {
    getSummary: vi.fn(),
    generateSummary: vi.fn(),
    downloadSummary: vi.fn(),
  },
}));

const mockGetOrCreateSession = vi.mocked(resourceAgentService.getOrCreateSession);
const mockListMessages = vi.mocked(resourceAgentService.listMessages);
const mockAskQuestion = vi.mocked(resourceAgentService.askQuestion);
const mockClearSession = vi.mocked(resourceAgentService.clearSession);
const mockGetSuggestions = vi.mocked(resourceAgentService.getSuggestions);
const mockGetSummary = vi.mocked(resourceSummaryService.getSummary);
const mockGenerateSummary = vi.mocked(resourceSummaryService.generateSummary);

const SESSION: AgentSessionResponse = {
  session: { id: "s1", resourceId: "r1", status: "ACTIVE", title: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
  sourceChanged: false,
};

function emptyMessages(): AgentMessagesResponse {
  return { data: [], meta: { page: 1, pageSize: 100, total: 0 }, session: SESSION.session, sourceChanged: false };
}

function assistantMessage(overrides: Partial<AgentMessage> = {}): AgentMessage {
  return {
    id: "m1",
    role: "ASSISTANT",
    content: "Normalization reduces redundancy.",
    citations: [],
    suggestedQuestions: [],
    createdAt: "2026-01-01T00:00:01.000Z",
    ...overrides,
  };
}

function apiError(status: number, code: string, message: string) {
  const error = new AxiosError(message);
  error.response = { status, data: { error: { code, message } } } as never;
  return error;
}

/** Mirrors ResourceDetail: launcher button + panel, with `isOpen` state
 * owned here (like the page owns it) so tests can open/close/rerender
 * exactly like the real integration. */
function Harness({ resourceId = "r1", initialOpen = false }: { resourceId?: string; initialOpen?: boolean }) {
  const [isOpen, setOpen] = useState(initialOpen);
  const launcherRef = createRef<HTMLButtonElement>();
  return (
    <div>
      <button ref={launcherRef} type="button" onClick={() => setOpen(true)}>
        Ask AI about this resource
      </button>
      <ResourceAgentPanel
        key={resourceId}
        resourceId={resourceId}
        resourceTitle="Diagnostic Smoke Test Resource"
        isOpen={isOpen}
        onClose={() => setOpen(false)}
        launcherButtonRef={launcherRef}
        onViewFullSummary={() => {}}
      />
    </div>
  );
}

function renderPanel(props: { resourceId?: string; initialOpen?: boolean } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Harness {...props} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  document.body.classList.remove("agent-panel-mobile-open");
  mockGetSuggestions.mockResolvedValue(["What is a candidate key?", "Explain normalization simply."]);
  mockGetSummary.mockResolvedValue({
    status: "NOT_GENERATED",
    sourceType: "TEXT_RESOURCE",
    summary: null,
    model: null,
    errorCode: null,
    errorMessage: null,
    generatedAt: null,
    updatedAt: null,
  });
});

describe("ResourceAgentPanel", () => {
  it("does not fetch a session or messages before the panel has ever been opened", async () => {
    renderPanel({ initialOpen: false });
    await new Promise((r) => setTimeout(r, 10));
    expect(mockGetOrCreateSession).not.toHaveBeenCalled();
    expect(mockListMessages).not.toHaveBeenCalled();
  });

  it("opens the panel, shows header/conversation/composer, and never sends a question just by opening", async () => {
    mockGetOrCreateSession.mockResolvedValue(SESSION);
    mockListMessages.mockResolvedValue(emptyMessages());
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: /ask ai about this resource/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/ask this resource/i)).toBeInTheDocument();
    expect(await screen.findByPlaceholderText(/ask a question about this resource/i)).toBeInTheDocument();
    expect(mockAskQuestion).not.toHaveBeenCalled();
    expect(mockGenerateSummary).not.toHaveBeenCalled();
  });

  it("restores an existing conversation on open (e.g. after a refresh)", async () => {
    mockGetOrCreateSession.mockResolvedValue(SESSION);
    mockListMessages.mockResolvedValue({
      ...emptyMessages(),
      data: [assistantMessage({ content: "Previously answered content." })],
    });
    renderPanel({ initialOpen: true });

    expect(await screen.findByText("Previously answered content.")).toBeInTheDocument();
  });

  it("shows the disabled state without a composer", async () => {
    mockGetOrCreateSession.mockRejectedValue(apiError(403, "AI_AGENT_DISABLED", "The study assistant is currently disabled."));
    renderPanel({ initialOpen: true });

    expect(await screen.findByText(/currently disabled/i)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows the unsupported-resource state", async () => {
    mockGetOrCreateSession.mockRejectedValue(
      apiError(409, "AGENT_UNSUPPORTED_SOURCE", "Generate the AI summary for this resource first, then ask questions about it."),
    );
    renderPanel({ initialOpen: true });

    expect(await screen.findByText(/generate the ai summary for this resource first/i)).toBeInTheDocument();
  });

  it("sends a question via a suggested-question button and renders the grounded answer", async () => {
    mockGetOrCreateSession.mockResolvedValue(SESSION);
    mockListMessages.mockResolvedValueOnce(emptyMessages());
    let resolveAsk!: (value: AgentMessage) => void;
    mockAskQuestion.mockReturnValue(new Promise<AgentMessage>((resolve) => (resolveAsk = resolve)));
    mockListMessages.mockResolvedValueOnce({
      ...emptyMessages(),
      data: [
        { id: "u1", role: "USER", content: "What is a candidate key?", citations: [], suggestedQuestions: [], createdAt: "t" },
        assistantMessage({ content: "A candidate key uniquely identifies a row." }),
      ],
    });

    renderPanel({ initialOpen: true });
    const suggestionButton = await screen.findByRole("button", { name: "What is a candidate key?" });
    fireEvent.click(suggestionButton);

    expect(await screen.findByText("What is a candidate key?")).toBeInTheDocument(); // optimistic bubble
    expect(await screen.findByRole("button", { name: /sending/i })).toBeDisabled();

    resolveAsk(assistantMessage());
    await waitFor(() => expect(screen.getByText("A candidate key uniquely identifies a row.")).toBeInTheDocument());
    expect(mockAskQuestion).toHaveBeenCalledTimes(1);
  });

  it("supports a follow-up question after the first answer", async () => {
    mockGetOrCreateSession.mockResolvedValue(SESSION);
    mockListMessages
      .mockResolvedValueOnce(emptyMessages())
      .mockResolvedValueOnce({ ...emptyMessages(), data: [assistantMessage({ id: "m1", content: "First answer." })] })
      .mockResolvedValueOnce({
        ...emptyMessages(),
        data: [assistantMessage({ id: "m1", content: "First answer." }), assistantMessage({ id: "m2", content: "Second answer." })],
      });
    mockAskQuestion.mockResolvedValue(assistantMessage({ id: "m1", content: "First answer." }));

    renderPanel({ initialOpen: true });
    const textarea = await screen.findByPlaceholderText(/ask a question about this resource/i);
    fireEvent.change(textarea, { target: { value: "First question?" } });
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));
    await waitFor(() => expect(screen.getByText("First answer.")).toBeInTheDocument());

    mockAskQuestion.mockResolvedValue(assistantMessage({ id: "m2", content: "Second answer." }));
    fireEvent.change(textarea, { target: { value: "Follow-up question?" } });
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));

    await waitFor(() => expect(screen.getByText("Second answer.")).toBeInTheDocument());
    expect(mockAskQuestion).toHaveBeenCalledTimes(2);
  });

  it("prevents a duplicate submission while a question is already in flight", async () => {
    mockGetOrCreateSession.mockResolvedValue(SESSION);
    mockListMessages.mockResolvedValue(emptyMessages());
    mockAskQuestion.mockReturnValue(new Promise(() => {}));

    renderPanel({ initialOpen: true });
    const textarea = await screen.findByPlaceholderText(/ask a question about this resource/i);
    fireEvent.change(textarea, { target: { value: "First question?" } });
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));

    const sendingButton = await screen.findByRole("button", { name: /sending/i });
    expect(sendingButton).toBeDisabled();
    fireEvent.click(sendingButton);
    expect(mockAskQuestion).toHaveBeenCalledTimes(1);
  });

  it("renders accessible, expandable citations", async () => {
    mockGetOrCreateSession.mockResolvedValue(SESSION);
    mockListMessages.mockResolvedValue({
      ...emptyMessages(),
      data: [
        assistantMessage({
          citations: [
            {
              chunkId: "11111111-1111-1111-1111-111111111111",
              pageNumber: 4,
              sectionTitle: "Normalization",
              sourceLabel: "Page 4",
              supportingExcerpt: "Normalization reduces redundancy step by step.",
            },
          ],
        }),
      ],
    });

    renderPanel({ initialOpen: true });
    const citationButton = await screen.findByRole("button", { name: /page 4/i });
    expect(citationButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/reduces redundancy step by step/i)).not.toBeInTheDocument();

    fireEvent.click(citationButton);
    expect(citationButton).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByText(/reduces redundancy step by step/i)).toBeInTheDocument();
  });

  it("renders NOT_FOUND (no citations) and PARTIAL answers as plain content", async () => {
    mockGetOrCreateSession.mockResolvedValue(SESSION);
    mockListMessages.mockResolvedValue({
      ...emptyMessages(),
      data: [
        assistantMessage({ id: "m-nf", content: "I could not find that information in this resource.", citations: [] }),
        assistantMessage({ id: "m-partial", content: "Partial information is available in this resource." }),
      ],
    });

    renderPanel({ initialOpen: true });
    expect(await screen.findByText(/could not find that information/i)).toBeInTheDocument();
    expect(await screen.findByText(/partial information is available/i)).toBeInTheDocument();
  });

  it("shows a safe error and allows retrying after a failed question (loading state is released)", async () => {
    mockGetOrCreateSession.mockResolvedValue(SESSION);
    mockListMessages.mockResolvedValue(emptyMessages());
    mockAskQuestion.mockRejectedValueOnce(apiError(502, "AGENT_PROVIDER_UNAVAILABLE", "The study assistant is temporarily unavailable."));

    renderPanel({ initialOpen: true });
    const textarea = await screen.findByPlaceholderText(/ask a question about this resource/i);
    fireEvent.change(textarea, { target: { value: "Will this fail?" } });
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/temporarily unavailable/i);
    await waitFor(() => expect(screen.getByRole("button", { name: /^send$/i })).not.toBeDisabled());
    // The failed question is left in the textarea so the user can retry without retyping.
    expect(textarea).toHaveValue("Will this fail?");
  });

  it("shows the daily-limit message returned by the backend", async () => {
    mockGetOrCreateSession.mockResolvedValue(SESSION);
    mockListMessages.mockResolvedValue(emptyMessages());
    mockAskQuestion.mockRejectedValueOnce(
      apiError(429, "AGENT_DAILY_LIMIT_REACHED", "You've reached today's limit of 10 study-assistant questions. Please try again tomorrow."),
    );

    renderPanel({ initialOpen: true });
    const textarea = await screen.findByPlaceholderText(/ask a question about this resource/i);
    fireEvent.change(textarea, { target: { value: "One more?" } });
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/reached today's limit/i);
  });

  it("shows a stale-source banner and offers to start a new conversation", async () => {
    mockGetOrCreateSession.mockResolvedValue({ ...SESSION, sourceChanged: true });
    mockListMessages.mockResolvedValue(emptyMessages());

    renderPanel({ initialOpen: true });
    expect(await screen.findByText(/this resource has changed since this conversation started/i)).toBeInTheDocument();
  });

  it("clears the conversation when the user confirms", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    mockGetOrCreateSession.mockResolvedValue(SESSION);
    mockListMessages.mockResolvedValue(emptyMessages());
    mockClearSession.mockResolvedValue({ ...SESSION.session, status: "CLEARED" });

    renderPanel({ initialOpen: true });
    const clearButton = await screen.findByRole("button", { name: /start a new conversation/i });
    fireEvent.click(clearButton);

    await waitFor(() => expect(mockClearSession).toHaveBeenCalledWith("r1", "s1"));
    confirmSpy.mockRestore();
  });

  it("always shows the disclaimer", async () => {
    mockGetOrCreateSession.mockResolvedValue(SESSION);
    mockListMessages.mockResolvedValue(emptyMessages());
    renderPanel({ initialOpen: true });
    expect(await screen.findByText(/AI-generated study assistance/i)).toBeInTheDocument();
  });

  it("submits via Ctrl+Enter from the textarea", async () => {
    mockGetOrCreateSession.mockResolvedValue(SESSION);
    mockListMessages.mockResolvedValue(emptyMessages());
    mockAskQuestion.mockReturnValue(new Promise(() => {}));

    renderPanel({ initialOpen: true });
    const textarea = await screen.findByPlaceholderText(/ask a question about this resource/i);
    fireEvent.change(textarea, { target: { value: "Keyboard question?" } });
    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });

    await waitFor(() => expect(mockAskQuestion).toHaveBeenCalledTimes(1));
  });

  describe("open/close mechanics", () => {
    it("closes on the Close button and never calls OpenAI while closing", async () => {
      mockGetOrCreateSession.mockResolvedValue(SESSION);
      mockListMessages.mockResolvedValue(emptyMessages());
      renderPanel({ initialOpen: true });

      const dialog = await screen.findByRole("dialog");
      fireEvent.click(within(dialog).getByRole("button", { name: /close ask this resource panel/i }));

      await waitFor(() => expect(dialog).toHaveAttribute("aria-hidden", "true"));
      expect(mockAskQuestion).not.toHaveBeenCalled();
    });

    it("closes on Escape", async () => {
      mockGetOrCreateSession.mockResolvedValue(SESSION);
      mockListMessages.mockResolvedValue(emptyMessages());
      renderPanel({ initialOpen: true });

      const dialog = await screen.findByRole("dialog");
      fireEvent.keyDown(document, { key: "Escape" });

      await waitFor(() => expect(dialog).toHaveAttribute("aria-hidden", "true"));
    });

    it("moves focus into the panel on open and returns it to the launcher on close", async () => {
      mockGetOrCreateSession.mockResolvedValue(SESSION);
      mockListMessages.mockResolvedValue(emptyMessages());
      renderPanel({ initialOpen: false });

      const launcher = screen.getByRole("button", { name: /ask ai about this resource/i });
      fireEvent.click(launcher);

      const dialog = await screen.findByRole("dialog");
      await waitFor(() => expect(document.activeElement).toBe(dialog));

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(document.activeElement).toBe(launcher));
    });

    it("preserves the conversation and an unsent draft across close and reopen", async () => {
      mockGetOrCreateSession.mockResolvedValue(SESSION);
      mockListMessages.mockResolvedValue({ ...emptyMessages(), data: [assistantMessage({ content: "Existing answer." })] });
      renderPanel({ initialOpen: true });

      const textarea = await screen.findByPlaceholderText(/ask a question about this resource/i);
      fireEvent.change(textarea, { target: { value: "An unsent draft" } });
      expect(await screen.findByText("Existing answer.")).toBeInTheDocument();

      // Capture the dialog node once — Testing Library's role queries
      // exclude aria-hidden elements by default, so re-querying by role
      // after closing wouldn't find it even though it's still mounted.
      const dialog = screen.getByRole("dialog");
      fireEvent.click(screen.getByRole("button", { name: /close ask this resource panel/i }));
      await waitFor(() => expect(dialog).toHaveAttribute("aria-hidden", "true"));

      fireEvent.click(screen.getByRole("button", { name: /ask ai about this resource/i }));
      await waitFor(() => expect(dialog).toHaveAttribute("aria-hidden", "false"));

      expect(screen.getByText("Existing answer.")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/ask a question about this resource/i)).toHaveValue("An unsent draft");
      // A session/messages fetch happens once on first open — reopening
      // must not have refetched or asked anything new.
      expect(mockGetOrCreateSession).toHaveBeenCalledTimes(1);
      expect(mockAskQuestion).not.toHaveBeenCalled();
    });
  });

  describe("responsive behaviour", () => {
    const originalMatchMedia = window.matchMedia;

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    it("shows no backdrop and a non-modal dialog on desktop", async () => {
      window.matchMedia = ((query: string) => ({
        matches: query.includes("1024"),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })) as typeof window.matchMedia;

      mockGetOrCreateSession.mockResolvedValue(SESSION);
      mockListMessages.mockResolvedValue(emptyMessages());
      renderPanel({ initialOpen: true });

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "false");
      expect(document.body.classList.contains("agent-panel-mobile-open")).toBe(false);
    });

    it("shows a backdrop, a modal dialog, and locks background scroll on mobile — cleaned up on close", async () => {
      mockGetOrCreateSession.mockResolvedValue(SESSION);
      mockListMessages.mockResolvedValue(emptyMessages());
      renderPanel({ initialOpen: true });

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      await waitFor(() => expect(document.body.classList.contains("agent-panel-mobile-open")).toBe(true));

      fireEvent.click(screen.getByRole("button", { name: /close ask this resource panel/i }));
      await waitFor(() => expect(document.body.classList.contains("agent-panel-mobile-open")).toBe(false));
    });
  });

  it("resets the draft when the resource changes (new component instance, like ResourceDetail's key={resourceId})", async () => {
    mockGetOrCreateSession.mockResolvedValue(SESSION);
    mockListMessages.mockResolvedValue(emptyMessages());
    const { rerender } = renderPanel({ resourceId: "r1", initialOpen: true });

    const textarea = await screen.findByPlaceholderText(/ask a question about this resource/i);
    fireEvent.change(textarea, { target: { value: "Draft for resource r1" } });
    expect(textarea).toHaveValue("Draft for resource r1");

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    rerender(
      <QueryClientProvider client={queryClient}>
        <Harness resourceId="r2" initialOpen={true} />
      </QueryClientProvider>,
    );

    const freshTextarea = await screen.findByPlaceholderText(/ask a question about this resource/i);
    expect(freshTextarea).toHaveValue("");
  });

  it("wraps long message content instead of overflowing", async () => {
    mockGetOrCreateSession.mockResolvedValue(SESSION);
    const longContent = "A".repeat(500);
    mockListMessages.mockResolvedValue({ ...emptyMessages(), data: [assistantMessage({ content: longContent })] });

    renderPanel({ initialOpen: true });
    const messageEl = await screen.findByText(longContent);
    expect(messageEl.className).toMatch(/break-words/);
  });

  it("applies motion-reduce-safe transition classes to the panel", async () => {
    mockGetOrCreateSession.mockResolvedValue(SESSION);
    mockListMessages.mockResolvedValue(emptyMessages());
    renderPanel({ initialOpen: true });

    const dialog = await screen.findByRole("dialog");
    expect(dialog.className).toMatch(/motion-reduce:duration-0/);
  });
});
