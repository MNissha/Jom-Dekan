import request from "supertest";
import { Document as DocxDocument, Packer, Paragraph, TextRun } from "docx";
import pdfParse from "pdf-parse";
import { createApp } from "../../src/app";
import { pool } from "../../src/config/config/db";
import { env } from "../../src/config/config/env";
import { seededTaxonomy, baseRegisterPayload } from "../helpers/registerPayload";

// Same mocking convention as resourceAiSummary.test.ts/resourceAgent.test.ts —
// this suite never calls the real OpenAI API, and pdf-parse is mocked per
// test (see that file's comment on why pdf-parse itself is unreliable
// under Jest against synthetic buffers).
jest.mock("../../src/services/openaiSummaryService", () => {
  const actual = jest.requireActual("../../src/services/openaiSummaryService");
  return { ...actual, openaiSummaryService: { generateStructuredSummary: jest.fn() } };
});
import { openaiSummaryService } from "../../src/services/openaiSummaryService";

jest.mock("../../src/services/openaiAgentService", () => {
  const actual = jest.requireActual("../../src/services/openaiAgentService");
  return {
    ...actual,
    openaiAgentService: { runAgentTurn: jest.fn(), hashUserIdForSafetyIdentifier: actual.hashUserIdForSafetyIdentifier },
  };
});
import { openaiAgentService } from "../../src/services/openaiAgentService";

jest.mock("pdf-parse", () => jest.fn());
const mockPdfParse = pdfParse as jest.MockedFunction<typeof pdfParse>;

const mockGenerate = openaiSummaryService.generateStructuredSummary as jest.Mock;
const mockRunAgentTurn = openaiAgentService.runAgentTurn as jest.Mock;

const app = createApp();

function summaryFor(overview: string) {
  return {
    overview,
    keyPoints: ["A key point."],
    studySections: [],
    topics: ["Topic"],
    glossary: [],
    limitations: [],
    language: "English",
    sufficientContent: true,
  };
}

function mockOpenAiSuccess(overview: string) {
  mockGenerate.mockResolvedValueOnce({
    summary: summaryFor(overview),
    model: env.aiSummary.model,
    inputTokens: 100,
    outputTokens: 80,
  });
}

async function buildRealDocx(text: string): Promise<Buffer> {
  const doc = new DocxDocument({ sections: [{ children: [new Paragraph({ children: [new TextRun(text)] })] }] });
  return Packer.toBuffer(doc);
}

const PDF_BUFFER = Buffer.from("%PDF-1.4\nfake\n%%EOF");
const PNG_BUFFER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2, 3, 4, 5]);
const XLSX_BUFFER = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("xl/worksheets/sheet1.xml")]);

async function dbReachable(): Promise<boolean> {
  try {
    await pool.query("SELECT 1 FROM resource_ai_summaries LIMIT 1");
    return true;
  } catch {
    return false;
  }
}

async function registerUser(label: string) {
  const taxonomy = await seededTaxonomy();
  if (!taxonomy) throw new Error("Run `npm run seed` against the test database before running this suite.");
  const email = `multi-file-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await request(app).post("/api/v1/auth/register").send(baseRegisterPayload(taxonomy, { email, displayName: label }));
  if (!res.body.accessToken) throw new Error(`registerUser("${label}") failed: ${JSON.stringify(res.body)}`);
  return { email, token: res.body.accessToken as string, id: res.body.user.id as string };
}

/** Uploads (and, unless told otherwise, confirms) a file — as the FIRST file this creates a fresh resource, otherwise it attaches to `resourceId`. */
async function uploadFile(
  token: string,
  buffer: Buffer,
  contentType: string,
  fileName: string,
  opts: { resourceId?: string; confirm?: boolean } = {},
) {
  const intentRes = await request(app)
    .post("/api/v1/resources/upload-intent")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: `Multi-file Source Test ${Date.now()}-${Math.random()}`,
      fileName,
      contentType,
      sizeBytes: buffer.length,
      category: "NOTES",
      ...(opts.resourceId ? { resourceId: opts.resourceId } : {}),
    });
  const { uploadUrl } = intentRes.body.data;
  const fileId = intentRes.body.data.file.id as string;
  const resourceId = intentRes.body.data.resource.id as string;
  await request(app).put(uploadUrl).set("Authorization", `Bearer ${token}`).attach("file", buffer, fileName);
  if (opts.confirm !== false) {
    await request(app).post(`/api/v1/resources/files/${fileId}/confirm`).set("Authorization", `Bearer ${token}`);
  }
  return { resourceId, fileId };
}

async function getSummary(token: string, resourceId: string, resourceFileId?: string) {
  return request(app)
    .get(`/api/v1/resources/${resourceId}/ai-summary`)
    .query(resourceFileId ? { resourceFileId } : {})
    .set("Authorization", `Bearer ${token}`);
}

async function generateSummary(token: string, resourceId: string, resourceFileId?: string) {
  return request(app)
    .post(`/api/v1/resources/${resourceId}/ai-summary`)
    .set("Authorization", `Bearer ${token}`)
    .send(resourceFileId ? { resourceFileId } : {});
}

describe("Multi-file resource: badges, AI source selection, cache and agent binding", () => {
  let skip = false;

  beforeAll(async () => {
    skip = !(await dbReachable());
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(() => {
    mockGenerate.mockClear();
    mockRunAgentTurn.mockClear();
    mockPdfParse.mockReset();
  });

  describe("resource-list badge aggregation", () => {
    it("shows TEXT for a text-only resource", async () => {
      if (skip) return;
      const user = await registerUser("badge-text");
      const res = await request(app)
        .post("/api/v1/resources/text")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ title: "Text badge test", description: "A sufficiently long text-only resource description.", category: "NOTES" });
      const resourceId = res.body.data.resource.id;

      const list = await request(app).get("/api/v1/resources?mine=true").set("Authorization", `Bearer ${user.token}`);
      const item = list.body.data.find((r: { id: string }) => r.id === resourceId);
      expect(item.readyFileCount).toBe(0);
      expect(item.fileTypeDisplay).toBe("TEXT");
    });

    it("shows the normalized type for a single READY file", async () => {
      if (skip) return;
      const user = await registerUser("badge-single");
      const { resourceId } = await uploadFile(user.token, PDF_BUFFER, "application/pdf", "notes.pdf");

      const list = await request(app).get("/api/v1/resources?mine=true").set("Authorization", `Bearer ${user.token}`);
      const item = list.body.data.find((r: { id: string }) => r.id === resourceId);
      expect(item.readyFileCount).toBe(1);
      expect(item.readyFileTypes).toEqual(["PDF"]);
      expect(item.fileTypeDisplay).toBe("PDF");
    });

    it("shows type + count for multiple READY files of the same type", async () => {
      if (skip) return;
      const user = await registerUser("badge-same-type");
      const { resourceId } = await uploadFile(user.token, PDF_BUFFER, "application/pdf", "a.pdf");
      await uploadFile(user.token, PDF_BUFFER, "application/pdf", "b.pdf", { resourceId });
      await uploadFile(user.token, PDF_BUFFER, "application/pdf", "c.pdf", { resourceId });

      const list = await request(app).get("/api/v1/resources?mine=true").set("Authorization", `Bearer ${user.token}`);
      const item = list.body.data.find((r: { id: string }) => r.id === resourceId);
      expect(item.readyFileCount).toBe(3);
      expect(item.readyFileTypes).toEqual(["PDF"]);
      expect(item.fileTypeDisplay).toBe("PDF");
    });

    it("shows MULTI-FILE for several READY files of different types", async () => {
      if (skip) return;
      const user = await registerUser("badge-mixed");
      const { resourceId } = await uploadFile(user.token, PDF_BUFFER, "application/pdf", "a.pdf");
      await uploadFile(user.token, PNG_BUFFER, "image/png", "b.png", { resourceId });

      const list = await request(app).get("/api/v1/resources?mine=true").set("Authorization", `Bearer ${user.token}`);
      const item = list.body.data.find((r: { id: string }) => r.id === resourceId);
      expect(item.readyFileCount).toBe(2);
      expect(new Set(item.readyFileTypes)).toEqual(new Set(["PDF", "PNG"]));
      expect(item.fileTypeDisplay).toBe("MULTI-FILE");
    });

    it("ignores a PENDING (unconfirmed) file when computing the badge", async () => {
      if (skip) return;
      const user = await registerUser("badge-pending");
      const { resourceId } = await uploadFile(user.token, PDF_BUFFER, "application/pdf", "a.pdf");
      await uploadFile(user.token, PNG_BUFFER, "image/png", "unconfirmed.png", { resourceId, confirm: false });

      const list = await request(app).get("/api/v1/resources?mine=true").set("Authorization", `Bearer ${user.token}`);
      const item = list.body.data.find((r: { id: string }) => r.id === resourceId);
      expect(item.readyFileCount).toBe(1);
      expect(item.fileTypeDisplay).toBe("PDF");
    });
  });

  describe("recommendation and available sources", () => {
    it("recommends a PDF over a DOCX and an image, in a multi-file resource", async () => {
      if (skip) return;
      const user = await registerUser("recommend-priority");
      const { resourceId } = await uploadFile(user.token, PNG_BUFFER, "image/png", "a.png");
      await uploadFile(user.token, PDF_BUFFER, "application/pdf", "b.pdf", { resourceId });
      const docxBuffer = await buildRealDocx("Some docx content.");
      await uploadFile(
        user.token,
        docxBuffer,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "c.docx",
        { resourceId },
      );

      const res = await getSummary(user.token, resourceId);
      expect(res.status).toBe(200);
      const recommended = res.body.data.availableSources.find((s: { recommended: boolean }) => s.recommended);
      expect(recommended.filename).toBe("b.pdf");
      expect(res.body.data.selectedSource.filename).toBe("b.pdf");
    });

    it("breaks a tie between two files of equal priority by upload order", async () => {
      if (skip) return;
      const user = await registerUser("recommend-tiebreak");
      const { resourceId } = await uploadFile(user.token, PDF_BUFFER, "application/pdf", "first.pdf");
      await uploadFile(user.token, PDF_BUFFER, "application/pdf", "second.pdf", { resourceId });

      const res = await getSummary(user.token, resourceId);
      const recommended = res.body.data.availableSources.find((s: { recommended: boolean }) => s.recommended);
      expect(recommended.filename).toBe("first.pdf");
    });

    it("marks an XLSX file as unsupported for AI in availableSources", async () => {
      if (skip) return;
      const user = await registerUser("recommend-unsupported");
      const { resourceId } = await uploadFile(user.token, PDF_BUFFER, "application/pdf", "a.pdf");
      await uploadFile(
        user.token,
        XLSX_BUFFER,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "b.xlsx",
        { resourceId },
      );

      const res = await getSummary(user.token, resourceId);
      const xlsxSource = res.body.data.availableSources.find((s: { filename: string }) => s.filename === "b.xlsx");
      expect(xlsxSource.supported).toBe(false);
      expect(xlsxSource.recommended).toBe(false);
    });

    it("does not show availableSources for a text-only resource", async () => {
      if (skip) return;
      const user = await registerUser("recommend-text-only");
      const create = await request(app)
        .post("/api/v1/resources/text")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ title: "No files here", description: "A sufficiently long text-only description for this test.", category: "NOTES" });
      const res = await getSummary(user.token, create.body.data.resource.id);
      expect(res.body.data.availableSources).toEqual([]);
      expect(res.body.data.selectedSource).toBeNull();
    });
  });

  describe("selecting a specific file", () => {
    it("generates using the explicitly selected (non-recommended) file", async () => {
      if (skip) return;
      mockPdfParse.mockResolvedValue({ text: "PDF body text with enough characters to summarize." } as Awaited<ReturnType<typeof pdfParse>>);
      const user = await registerUser("select-explicit");
      const { resourceId, fileId: pdfFileId } = await uploadFile(user.token, PDF_BUFFER, "application/pdf", "recommended.pdf");
      const docxBuffer = await buildRealDocx("DOCX body text with enough characters to summarize on its own.");
      const { fileId: docxFileId } = await uploadFile(
        user.token,
        docxBuffer,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "chosen.docx",
        { resourceId },
      );

      mockOpenAiSuccess("Summary of the DOCX file specifically.");
      const genRes = await generateSummary(user.token, resourceId, docxFileId);
      expect(genRes.status).toBe(200);
      expect(genRes.body.data.status).toBe("READY");
      expect(genRes.body.data.sourceType).toBe("EXTRACTED_DOCUMENT");
      expect(genRes.body.data.selectedSource.filename).toBe("chosen.docx");
      expect(genRes.body.data.selectedSource.resourceFileId).toBe(docxFileId);
      expect(genRes.body.data.summary.overview).toBe("Summary of the DOCX file specifically.");
      void pdfFileId;
    });

    it("rejects a resourceFileId that belongs to a different resource", async () => {
      if (skip) return;
      const user = await registerUser("select-wrong-resource");
      const { resourceId: resourceA } = await uploadFile(user.token, PDF_BUFFER, "application/pdf", "a.pdf");
      const { fileId: fileFromB } = await uploadFile(user.token, PDF_BUFFER, "application/pdf", "b.pdf");

      const res = await generateSummary(user.token, resourceA, fileFromB);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("AI_SOURCE_FILE_NOT_FOUND");
      expect(mockGenerate).not.toHaveBeenCalled();
    });

    it("rejects a resourceFileId that is not yet READY", async () => {
      if (skip) return;
      const user = await registerUser("select-not-ready");
      const { resourceId } = await uploadFile(user.token, PDF_BUFFER, "application/pdf", "a.pdf");
      const { fileId: pendingFileId } = await uploadFile(user.token, PNG_BUFFER, "image/png", "pending.png", {
        resourceId,
        confirm: false,
      });

      const res = await generateSummary(user.token, resourceId, pendingFileId);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("AI_SOURCE_FILE_NOT_READY");
      expect(mockGenerate).not.toHaveBeenCalled();
    });

    it("reports an explicitly selected unsupported file as UNSUPPORTED without calling OpenAI", async () => {
      if (skip) return;
      const user = await registerUser("select-unsupported");
      const { resourceId } = await uploadFile(user.token, PDF_BUFFER, "application/pdf", "a.pdf");
      const { fileId: xlsxFileId } = await uploadFile(
        user.token,
        XLSX_BUFFER,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "b.xlsx",
        { resourceId },
      );

      const res = await generateSummary(user.token, resourceId, xlsxFileId);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("UNSUPPORTED");
      expect(res.body.data.errorCode).toBe("UNSUPPORTED_MIME_TYPE");
      expect(mockGenerate).not.toHaveBeenCalled();
    });
  });

  describe("per-file cache isolation", () => {
    it("reuses the cache for the same selected file on a second generate call", async () => {
      if (skip) return;
      mockPdfParse.mockResolvedValue({ text: "Enough extractable PDF text to summarize here." } as Awaited<ReturnType<typeof pdfParse>>);
      const user = await registerUser("cache-reuse");
      const { resourceId, fileId } = await uploadFile(user.token, PDF_BUFFER, "application/pdf", "a.pdf");

      mockOpenAiSuccess("First generation.");
      const first = await generateSummary(user.token, resourceId, fileId);
      expect(first.body.data.status).toBe("READY");

      const second = await generateSummary(user.token, resourceId, fileId);
      expect(second.status).toBe(200);
      expect(second.body.data.status).toBe("READY");
      expect(second.body.data.summary.overview).toBe("First generation.");
      expect(mockGenerate).toHaveBeenCalledTimes(1);
    });

    it("does not share a cached summary between two different files on the same resource", async () => {
      if (skip) return;
      mockPdfParse.mockResolvedValue({ text: "PDF text with enough characters to summarize." } as Awaited<ReturnType<typeof pdfParse>>);
      const user = await registerUser("cache-isolation");
      const { resourceId, fileId: pdfFileId } = await uploadFile(user.token, PDF_BUFFER, "application/pdf", "a.pdf");
      const docxBuffer = await buildRealDocx("DOCX text with enough characters to summarize independently.");
      const { fileId: docxFileId } = await uploadFile(
        user.token,
        docxBuffer,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "b.docx",
        { resourceId },
      );

      mockOpenAiSuccess("PDF-specific summary.");
      await generateSummary(user.token, resourceId, pdfFileId);

      // The DOCX file has never been generated — GET must show NOT_GENERATED
      // for it specifically, never the PDF's cached content.
      const docxView = await getSummary(user.token, resourceId, docxFileId);
      expect(docxView.body.data.status).toBe("NOT_GENERATED");

      mockOpenAiSuccess("DOCX-specific summary.");
      const docxGen = await generateSummary(user.token, resourceId, docxFileId);
      expect(docxGen.body.data.summary.overview).toBe("DOCX-specific summary.");

      const pdfView = await getSummary(user.token, resourceId, pdfFileId);
      expect(pdfView.body.data.summary.overview).toBe("PDF-specific summary.");
      expect(mockGenerate).toHaveBeenCalledTimes(2);
    });

    it("protects concurrent generation requests for the same selected file (only one reaches OpenAI)", async () => {
      if (skip) return;
      mockPdfParse.mockResolvedValue({ text: "Enough extractable PDF text for a concurrency test." } as Awaited<ReturnType<typeof pdfParse>>);
      const user = await registerUser("cache-concurrent");
      const { resourceId, fileId } = await uploadFile(user.token, PDF_BUFFER, "application/pdf", "a.pdf");

      let resolveGenerate!: (value: unknown) => void;
      mockGenerate.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveGenerate = resolve;
        }),
      );

      const firstPromise = generateSummary(user.token, resourceId, fileId);
      // Give the first request time to claim the row before firing the second.
      await new Promise((r) => setTimeout(r, 50));
      const second = await generateSummary(user.token, resourceId, fileId);
      expect(second.status).toBe(409);
      expect(second.body.error.code).toBe("CONFLICT");

      resolveGenerate({ summary: summaryFor("Concurrent-safe summary."), model: env.aiSummary.model, inputTokens: 1, outputTokens: 1 });
      const first = await firstPromise;
      expect(first.body.data.status).toBe("READY");
      expect(mockGenerate).toHaveBeenCalledTimes(1);
    });
  });

  describe("downloads bound to the selected source", () => {
    it("downloads the cached summary for the currently selected file, never calling OpenAI", async () => {
      if (skip) return;
      mockPdfParse.mockResolvedValue({ text: "PDF content for the download test." } as Awaited<ReturnType<typeof pdfParse>>);
      const user = await registerUser("download-selected");
      const { resourceId, fileId: pdfFileId } = await uploadFile(user.token, PDF_BUFFER, "application/pdf", "a.pdf");
      const docxBuffer = await buildRealDocx("DOCX content for the download test, kept separate from the PDF.");
      const { fileId: docxFileId } = await uploadFile(
        user.token,
        docxBuffer,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "b.docx",
        { resourceId },
      );

      mockOpenAiSuccess("PDF overview for download.");
      await generateSummary(user.token, resourceId, pdfFileId);
      mockOpenAiSuccess("DOCX overview for download.");
      await generateSummary(user.token, resourceId, docxFileId);
      mockGenerate.mockClear();

      const download = await request(app)
        .get(`/api/v1/resources/${resourceId}/ai-summary/download`)
        .query({ format: "docx", resourceFileId: docxFileId })
        .set("Authorization", `Bearer ${user.token}`);

      expect(download.status).toBe(200);
      expect(mockGenerate).not.toHaveBeenCalled();
    });

    it("returns 404 when no summary exists yet for the selected file", async () => {
      if (skip) return;
      const user = await registerUser("download-not-ready");
      const { resourceId, fileId } = await uploadFile(user.token, PDF_BUFFER, "application/pdf", "a.pdf");

      const download = await request(app)
        .get(`/api/v1/resources/${resourceId}/ai-summary/download`)
        .query({ format: "pdf", resourceFileId: fileId })
        .set("Authorization", `Bearer ${user.token}`);
      expect(download.status).toBe(404);
    });
  });

  describe("agent source binding in a multi-file resource", () => {
    async function readyMultiFileResource(label: string) {
      mockPdfParse.mockResolvedValue({ text: "Alpha document content about topic Alpha." } as Awaited<ReturnType<typeof pdfParse>>);
      const user = await registerUser(label);
      const { resourceId, fileId: pdfFileId } = await uploadFile(user.token, PDF_BUFFER, "application/pdf", "alpha.pdf");
      const docxBuffer = await buildRealDocx("Beta document content about an unrelated topic called Zephyr.");
      const { fileId: docxFileId } = await uploadFile(
        user.token,
        docxBuffer,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "beta.docx",
        { resourceId },
      );
      mockOpenAiSuccess("Alpha summary.");
      await generateSummary(user.token, resourceId, pdfFileId);
      mockOpenAiSuccess("Beta summary.");
      await generateSummary(user.token, resourceId, docxFileId);
      return { user, resourceId, pdfFileId, docxFileId };
    }

    it("binds a new session to the explicitly selected file and never calls OpenAI to create it", async () => {
      if (skip) return;
      const { user, resourceId, docxFileId } = await readyMultiFileResource("agent-bind-select");

      const sessionRes = await request(app)
        .post(`/api/v1/resources/${resourceId}/agent/sessions`)
        .set("Authorization", `Bearer ${user.token}`)
        .send({ resourceFileId: docxFileId });

      expect(sessionRes.status).toBe(200);
      expect(sessionRes.body.data.session.resourceFileId).toBe(docxFileId);
      expect(mockRunAgentTurn).not.toHaveBeenCalled();
    });

    it("searching this session's evidence only ever returns chunks from its own selected file", async () => {
      if (skip) return;
      const { user, resourceId, pdfFileId, docxFileId } = await readyMultiFileResource("agent-search-isolation");

      // Index both files' chunks by opening a session for each.
      await request(app)
        .post(`/api/v1/resources/${resourceId}/agent/sessions`)
        .set("Authorization", `Bearer ${user.token}`)
        .send({ resourceFileId: pdfFileId });
      const betaSession = await request(app)
        .post(`/api/v1/resources/${resourceId}/agent/sessions`)
        .set("Authorization", `Bearer ${user.token}`)
        .send({ resourceFileId: docxFileId });

      let searchedChunks: Array<{ chunkId: string; content: string }> = [];
      mockRunAgentTurn.mockImplementationOnce(async ({ executors }) => {
        searchedChunks = await executors.search("Alpha");
        return {
          answer: { answer: "No mention of Alpha here.", answerStatus: "NOT_FOUND", citations: [], suggestedQuestions: [] },
          model: env.aiAgent.model,
          inputTokens: 10,
          outputTokens: 5,
          cachedInputTokens: 0,
          requestId: "req_isolation",
          evidenceChunkIds: new Set<string>(),
        };
      });

      await request(app)
        .post(`/api/v1/resources/${resourceId}/agent/sessions/${betaSession.body.data.session.id}/messages`)
        .set("Authorization", `Bearer ${user.token}`)
        .send({ question: "Does this mention Alpha?" });

      // Searching from the Beta (DOCX) session must never surface content
      // that only exists in the Alpha (PDF) file's chunks.
      expect(searchedChunks.every((c) => !c.content.includes("Alpha"))).toBe(true);
    });

    it("switching the selected file starts a fresh session and clears the old one, rather than mutating it", async () => {
      if (skip) return;
      const { user, resourceId, pdfFileId, docxFileId } = await readyMultiFileResource("agent-switch-session");

      const first = await request(app)
        .post(`/api/v1/resources/${resourceId}/agent/sessions`)
        .set("Authorization", `Bearer ${user.token}`)
        .send({ resourceFileId: pdfFileId });
      const firstSessionId = first.body.data.session.id;

      const second = await request(app)
        .post(`/api/v1/resources/${resourceId}/agent/sessions`)
        .set("Authorization", `Bearer ${user.token}`)
        .send({ resourceFileId: docxFileId });

      expect(second.body.data.session.id).not.toBe(firstSessionId);
      expect(second.body.data.sourceChanged).toBe(true);

      const row = await pool.query("SELECT status, resource_file_id FROM resource_agent_sessions WHERE id = $1", [firstSessionId]);
      expect(row.rows[0].status).toBe("CLEARED");
      expect(row.rows[0].resource_file_id).toBe(pdfFileId); // never mutated in place
    });
  });
});
