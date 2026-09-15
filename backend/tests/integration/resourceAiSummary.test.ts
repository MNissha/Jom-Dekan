import request from "supertest";
import { Document as DocxDocument, Packer, Paragraph, TextRun } from "docx";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { createApp } from "../../src/app";
import { pool } from "../../src/config/config/db";
import { env } from "../../src/config/config/env";
import { logger } from "../../src/utils/logger";
import { seededTaxonomy, baseRegisterPayload } from "../helpers/registerPayload";
import { extractPdfKitText } from "../helpers/extractPdfKitText";

// The real OpenAI client is never constructed in this suite — every test
// controls `generateStructuredSummary`'s resolved/rejected value directly,
// so no test can ever spend real API credit. `OpenAiSummaryError` is kept
// as the real class (via requireActual) so resourceSummaryService's
// `instanceof` checks still behave correctly against rejected mocks.
jest.mock("../../src/services/openaiSummaryService", () => {
  const actual = jest.requireActual("../../src/services/openaiSummaryService");
  return { ...actual, openaiSummaryService: { generateStructuredSummary: jest.fn() } };
});
import { openaiSummaryService, OpenAiSummaryError } from "../../src/services/openaiSummaryService";

// pdf-parse's own PDF-parsing correctness is exercised in
// tests/unit/resourceTextExtractionService.test.ts against controlled
// inputs — its old bundled pdf.js proved unreliable/inconsistent against
// hand-built or pdfkit-generated fixtures repeated within one process in
// this environment. Mocking it here keeps this suite's PDF-path tests
// deterministic; the PDF *download* tests below verify our own
// renderer's real output via extractPdfKitText instead (no pdf-parse
// involved), and the DOCX path uses the real `docx`/`mammoth` pairing
// end-to-end, which proved reliable.
// An explicit factory (not a bare `jest.mock("pdf-parse")`) — see the
// comment in tests/unit/resourceTextExtractionService.test.ts for why
// automocking this specific package crashes under Jest.
jest.mock("pdf-parse", () => jest.fn());
const mockPdfParse = pdfParse as jest.MockedFunction<typeof pdfParse>;

const mockGenerate = openaiSummaryService.generateStructuredSummary as jest.Mock;

const app = createApp();

const VALID_SUMMARY = {
  overview: "An overview of the academic resource content, kept within the documented word limit.",
  keyPoints: ["First key point.", "Second key point.", "Third key point."],
  studySections: [{ heading: "Section One", content: "Detailed notes for section one." }],
  topics: ["Topic Alpha", "Topic Beta"],
  glossary: [{ term: "Sample Term", definition: "A definition of the sample term." }],
  limitations: ["The source may omit later chapters."],
  language: "English",
  sufficientContent: true,
};

function mockOpenAiSuccess(overrides: Partial<typeof VALID_SUMMARY> = {}) {
  mockGenerate.mockResolvedValueOnce({
    summary: { ...VALID_SUMMARY, ...overrides },
    model: env.aiSummary.model,
    inputTokens: 120,
    outputTokens: 80,
  });
}

async function buildRealDocx(text: string): Promise<Buffer> {
  const doc = new DocxDocument({ sections: [{ children: [new Paragraph({ children: [new TextRun(text)] })] }] });
  return Packer.toBuffer(doc);
}

const GARBAGE_PDF_BUFFER = Buffer.from("%PDF-1.4\nnot a real pdf structure\n%%EOF");
const PNG_BUFFER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2, 3, 4, 5]);
const JPEG_BUFFER = Buffer.from([0xff, 0xd8, 0xff, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const XLSX_BUFFER = Buffer.concat([
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from("xl/worksheets/sheet1.xml"),
]);

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
  if (!taxonomy) {
    throw new Error("Run `npm run seed` against the test database before running this suite.");
  }
  const email = `ai-summary-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send(baseRegisterPayload(taxonomy, { email, displayName: label }));
  if (!res.body.accessToken) {
    throw new Error(`registerUser("${label}") failed: ${JSON.stringify(res.body)}`);
  }
  return { email, token: res.body.accessToken as string, id: res.body.user.id as string };
}

async function createTextResource(token: string, overrides: Partial<Record<string, unknown>> = {}) {
  const res = await request(app)
    .post("/api/v1/resources/text")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: `AI Summary Text Resource ${Date.now()}-${Math.random()}`,
      description:
        "This is a sufficiently long text-only resource description used to exercise the AI summary feature end to end.",
      category: "NOTES",
      ...overrides,
    });
  return res.body.data.resource.id as string;
}

async function createFileResource(token: string, buffer: Buffer, contentType: string, fileName: string) {
  const intentRes = await request(app)
    .post("/api/v1/resources/upload-intent")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: `AI Summary File Resource ${Date.now()}-${Math.random()}`,
      fileName,
      contentType,
      sizeBytes: buffer.length,
      category: "NOTES",
    });
  const { uploadUrl } = intentRes.body.data;
  const fileId = intentRes.body.data.file.id;
  const resourceId = intentRes.body.data.resource.id;

  await request(app).put(uploadUrl).set("Authorization", `Bearer ${token}`).attach("file", buffer, fileName);
  await request(app).post(`/api/v1/resources/files/${fileId}/confirm`).set("Authorization", `Bearer ${token}`);

  return resourceId as string;
}

/** Same as createFileResource, but skips the confirm step — the resource stays PENDING. */
async function createPendingFileResource(token: string, buffer: Buffer, contentType: string, fileName: string) {
  const intentRes = await request(app)
    .post("/api/v1/resources/upload-intent")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: `AI Summary Pending Resource ${Date.now()}-${Math.random()}`,
      fileName,
      contentType,
      sizeBytes: buffer.length,
      category: "NOTES",
    });
  const { uploadUrl } = intentRes.body.data;
  const resourceId = intentRes.body.data.resource.id;
  await request(app).put(uploadUrl).set("Authorization", `Bearer ${token}`).attach("file", buffer, fileName);
  return resourceId as string;
}

describe("AI Resource Summary API", () => {
  let skip = false;
  let ownerToken = "";
  let strangerToken = "";

  beforeAll(async () => {
    skip = !(await dbReachable());
    if (skip) return;
    const owner = await registerUser("owner");
    ownerToken = owner.token;
    const stranger = await registerUser("stranger");
    strangerToken = stranger.token;
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(() => {
    mockGenerate.mockClear();
  });

  it("GET returns NOT_GENERATED for a fresh resource without calling OpenAI", async () => {
    if (skip) return;
    const resourceId = await createTextResource(ownerToken);
    const res = await request(app)
      .get(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("NOT_GENERATED");
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request", async () => {
    if (skip) return;
    const resourceId = await createTextResource(ownerToken);
    const res = await request(app).get(`/api/v1/resources/${resourceId}/ai-summary`);
    expect(res.status).toBe(401);
  });

  it("hides a non-visible (PENDING, someone else's) resource with 404", async () => {
    if (skip) return;
    const resourceId = await createPendingFileResource(ownerToken, GARBAGE_PDF_BUFFER, "application/pdf", "notes.pdf");
    const res = await request(app)
      .get(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${strangerToken}`);
    expect(res.status).toBe(404);
  });

  it("generates a summary from a text-only resource and reuses it on later GET/POST calls", async () => {
    if (skip) return;
    const resourceId = await createTextResource(ownerToken);
    mockOpenAiSuccess();

    const genRes = await request(app)
      .post(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(genRes.status).toBe(200);
    expect(genRes.body.data.status).toBe("READY");
    expect(genRes.body.data.sourceType).toBe("TEXT_RESOURCE");
    expect(genRes.body.data.summary.overview).toBe(VALID_SUMMARY.overview);
    expect(mockGenerate).toHaveBeenCalledTimes(1);

    const getRes = await request(app)
      .get(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.status).toBe("READY");
    expect(mockGenerate).toHaveBeenCalledTimes(1);

    const secondGenRes = await request(app)
      .post(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(secondGenRes.status).toBe(200);
    expect(secondGenRes.body.data.status).toBe("READY");
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it("does not return a stale summary once the resource's content (and so its source hash) changes", async () => {
    if (skip) return;
    const resourceId = await createTextResource(ownerToken);
    mockOpenAiSuccess({ overview: "Overview for the original content." });
    await request(app)
      .post(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${ownerToken}`);

    await request(app)
      .put(`/api/v1/resources/${resourceId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ title: "Updated title that changes the source hash" });

    const getRes = await request(app)
      .get(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(getRes.body.data.status).toBe("NOT_GENERATED");
  });

  it("protects against concurrent duplicate generation requests with only one OpenAI call", async () => {
    if (skip) return;
    const resourceId = await createTextResource(ownerToken);
    mockOpenAiSuccess();

    const [a, b] = await Promise.all([
      request(app).post(`/api/v1/resources/${resourceId}/ai-summary`).set("Authorization", `Bearer ${ownerToken}`),
      request(app).post(`/api/v1/resources/${resourceId}/ai-summary`).set("Authorization", `Bearer ${ownerToken}`),
    ]);

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    const statuses = [a.status, b.status].sort();
    // Either both observe the same READY result, or the loser gets a 409
    // while the winner completes — never two separate OpenAI calls.
    expect(statuses.every((s) => s === 200 || s === 409)).toBe(true);
    expect(statuses.includes(200)).toBe(true);
  });

  it("marks an unsupported file type (xlsx) as UNSUPPORTED without calling OpenAI", async () => {
    if (skip) return;
    const resourceId = await createFileResource(
      ownerToken,
      XLSX_BUFFER,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "sheet.xlsx",
    );
    const res = await request(app)
      .post(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("UNSUPPORTED");
    expect(res.body.data.errorCode).toBe("UNSUPPORTED_MIME_TYPE");
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("marks a scanned/garbled PDF with no extractable text as UNSUPPORTED (insufficient content) without calling OpenAI", async () => {
    if (skip) return;
    mockPdfParse.mockRejectedValueOnce(new Error("Invalid PDF structure"));
    const resourceId = await createFileResource(ownerToken, GARBAGE_PDF_BUFFER, "application/pdf", "scanned.pdf");
    const res = await request(app)
      .post(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("UNSUPPORTED");
    expect(res.body.data.errorCode).toBe("INSUFFICIENT_CONTENT");
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("summarizes a PDF with extractable text successfully", async () => {
    if (skip) return;
    mockPdfParse.mockResolvedValueOnce({
      text: "Data structures such as arrays, linked lists, stacks, and queues are foundational to computer science curricula.",
    } as Awaited<ReturnType<typeof pdfParse>>);
    const resourceId = await createFileResource(ownerToken, GARBAGE_PDF_BUFFER, "application/pdf", "real.pdf");
    mockOpenAiSuccess();
    const res = await request(app)
      .post(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("READY");
    expect(res.body.data.sourceType).toBe("EXTRACTED_DOCUMENT");
  });

  it("summarizes a real DOCX file successfully (extraction and generation are both exercised end to end)", async () => {
    if (skip) return;
    const docxBuffer = await buildRealDocx(
      "Data structures such as arrays, linked lists, stacks, and queues are foundational to computer science curricula.",
    );
    const resourceId = await createFileResource(
      ownerToken,
      docxBuffer,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "real.docx",
    );
    mockOpenAiSuccess();
    const res = await request(app)
      .post(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("READY");
    expect(res.body.data.sourceType).toBe("EXTRACTED_DOCUMENT");
  });

  it("summarizes a PNG image successfully and caches the result (no second OpenAI call)", async () => {
    if (skip) return;
    const resourceId = await createFileResource(ownerToken, PNG_BUFFER, "image/png", "screenshot.png");
    mockOpenAiSuccess();

    const res = await request(app)
      .post(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("READY");
    expect(res.body.data.sourceType).toBe("IMAGE");
    expect(mockGenerate).toHaveBeenCalledTimes(1);

    const repeat = await request(app)
      .post(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(repeat.status).toBe(200);
    expect(repeat.body.data.status).toBe("READY");
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it("summarizes a JPEG image successfully", async () => {
    if (skip) return;
    const resourceId = await createFileResource(ownerToken, JPEG_BUFFER, "image/jpeg", "photo.jpg");
    mockOpenAiSuccess();
    const res = await request(app)
      .post(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("READY");
    expect(res.body.data.sourceType).toBe("IMAGE");
  });

  it("rejects an oversized image before ever calling OpenAI", async () => {
    if (skip) return;
    const oversized = Buffer.concat([PNG_BUFFER, Buffer.alloc(env.aiSummary.maxImageSizeBytes + 1024)]);
    const resourceId = await createFileResource(ownerToken, oversized, "image/png", "huge.png");
    const res = await request(app)
      .post(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("UNSUPPORTED");
    expect(res.body.data.errorCode).toBe("IMAGE_TOO_LARGE");
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("marks the result UNSUPPORTED when the model itself reports no summarizable content (blank/irrelevant image)", async () => {
    if (skip) return;
    const resourceId = await createFileResource(ownerToken, PNG_BUFFER, "image/png", "blank.png");
    mockOpenAiSuccess({ sufficientContent: false });
    const res = await request(app)
      .post(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("UNSUPPORTED");
    expect(res.body.data.errorCode).toBe("AI_INSUFFICIENT_CONTENT");
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it("marks the attempt FAILED (with a safe, generic message) when the OpenAI call itself fails, and allows a later retry", async () => {
    if (skip) return;
    const resourceId = await createTextResource(ownerToken);
    mockGenerate.mockRejectedValueOnce(
      new OpenAiSummaryError("OPENAI_REQUEST_FAILED", "The AI summary service is temporarily unavailable."),
    );

    const failRes = await request(app)
      .post(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(failRes.status).toBe(502);
    expect(failRes.body.error.code).toBe("AI_SUMMARY_GENERATION_FAILED");
    // Never leak the raw provider error text to the client.
    expect(JSON.stringify(failRes.body)).not.toMatch(/temporarily unavailable/);

    const getRes = await request(app)
      .get(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(getRes.body.data.status).toBe("FAILED");

    mockOpenAiSuccess();
    const retryRes = await request(app)
      .post(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(retryRes.status).toBe(200);
    expect(retryRes.body.data.status).toBe("READY");
  });

  it("marks the attempt FAILED when the model returns invalid/unparseable JSON", async () => {
    if (skip) return;
    const resourceId = await createTextResource(ownerToken);
    mockGenerate.mockRejectedValueOnce(
      new OpenAiSummaryError("OPENAI_INVALID_RESPONSE", "The model returned an unexpected response shape."),
    );
    const res = await request(app)
      .post(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(502);
    const getRes = await request(app)
      .get(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(getRes.body.data.status).toBe("FAILED");
  });

  it("enforces the daily per-user generation limit without calling OpenAI once exceeded", async () => {
    if (skip) return;
    const originalLimit = env.aiSummary.dailyUserLimit;
    env.aiSummary.dailyUserLimit = 2;
    try {
      const limitUser = await registerUser("daily-limit");
      for (let i = 0; i < 2; i += 1) {
        const resourceId = await createTextResource(limitUser.token);
        mockOpenAiSuccess();
        const res = await request(app)
          .post(`/api/v1/resources/${resourceId}/ai-summary`)
          .set("Authorization", `Bearer ${limitUser.token}`);
        expect(res.status).toBe(200);
      }
      expect(mockGenerate).toHaveBeenCalledTimes(2);

      const thirdResourceId = await createTextResource(limitUser.token);
      const overLimitRes = await request(app)
        .post(`/api/v1/resources/${thirdResourceId}/ai-summary`)
        .set("Authorization", `Bearer ${limitUser.token}`);
      expect(overLimitRes.status).toBe(429);
      expect(overLimitRes.body.error.code).toBe("AI_SUMMARY_DAILY_LIMIT_REACHED");
      expect(mockGenerate).toHaveBeenCalledTimes(2);
    } finally {
      env.aiSummary.dailyUserLimit = originalLimit;
    }
  });

  it("returns a clear DISABLED state (GET) and a 403 (POST) when the feature flag is off", async () => {
    if (skip) return;
    const original = env.aiSummary.enabled;
    env.aiSummary.enabled = false;
    try {
      const resourceId = await createTextResource(ownerToken);
      const getRes = await request(app)
        .get(`/api/v1/resources/${resourceId}/ai-summary`)
        .set("Authorization", `Bearer ${ownerToken}`);
      expect(getRes.body.data.status).toBe("DISABLED");

      const postRes = await request(app)
        .post(`/api/v1/resources/${resourceId}/ai-summary`)
        .set("Authorization", `Bearer ${ownerToken}`);
      expect(postRes.status).toBe(403);
      expect(postRes.body.error.code).toBe("AI_SUMMARY_DISABLED");
      expect(mockGenerate).not.toHaveBeenCalled();
    } finally {
      env.aiSummary.enabled = original;
    }
  });

  describe("downloads", () => {
    // A dedicated user per describe block, rather than the shared
    // `ownerToken` — by this point in the file, ownerToken has already
    // made close to (or exactly) env.aiSummary.dailyUserLimit real
    // generation attempts from earlier tests, which is itself a nice
    // organic confirmation the daily limit works, but would make these
    // download tests flaky if they shared that same budget.
    let downloadUserToken = "";

    beforeAll(async () => {
      if (skip) return;
      const user = await registerUser("downloads");
      downloadUserToken = user.token;
    });

    it("requires a READY summary to exist before downloading", async () => {
      if (skip) return;
      const resourceId = await createTextResource(downloadUserToken);
      const res = await request(app)
        .get(`/api/v1/resources/${resourceId}/ai-summary/download?format=pdf`)
        .set("Authorization", `Bearer ${downloadUserToken}`);
      expect(res.status).toBe(404);
    });

    it("rejects an invalid format value", async () => {
      if (skip) return;
      const resourceId = await createTextResource(downloadUserToken);
      const res = await request(app)
        .get(`/api/v1/resources/${resourceId}/ai-summary/download?format=exe`)
        .set("Authorization", `Bearer ${downloadUserToken}`);
      expect(res.status).toBe(400);
    });

    it("downloads a well-formed PDF containing the expected content, never calling OpenAI", async () => {
      if (skip) return;
      const resourceId = await createTextResource(downloadUserToken, { title: "Downloadable PDF Resource" });
      mockOpenAiSuccess();
      await request(app)
        .post(`/api/v1/resources/${resourceId}/ai-summary`)
        .set("Authorization", `Bearer ${downloadUserToken}`);
      expect(mockGenerate).toHaveBeenCalledTimes(1);

      const res = await request(app)
        .get(`/api/v1/resources/${resourceId}/ai-summary/download?format=pdf`)
        .set("Authorization", `Bearer ${downloadUserToken}`)
        .buffer(true)
        .parse((response, callback) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => chunks.push(chunk));
          response.on("end", () => callback(null, Buffer.concat(chunks)));
        });

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/pdf");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["content-disposition"]).toContain("AI-Summary.pdf");
      expect(res.headers["content-disposition"]).toContain("Downloadable-PDF-Resource");
      expect(res.headers["content-disposition"]).not.toMatch(/[\r\n]/);

      const buffer = res.body as Buffer;
      expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");

      // Our own renderer's real output — verified via extractPdfKitText,
      // not the (mocked-in-this-file) pdf-parse library.
      const text = extractPdfKitText(buffer);
      expect(text).toContain("Downloadable PDF Resource");
      expect(text).toContain(VALID_SUMMARY.overview);
      expect(text).toContain(VALID_SUMMARY.keyPoints[0]);
      expect(text).toContain("JomDekan");
      expect(text).toContain("This summary may contain mistakes");

      // The download route must never call OpenAI.
      expect(mockGenerate).toHaveBeenCalledTimes(1);
    });

    it("downloads a well-formed DOCX (valid zip) containing the expected content, never calling OpenAI", async () => {
      if (skip) return;
      const resourceId = await createTextResource(downloadUserToken, { title: "Downloadable Word Resource" });
      mockOpenAiSuccess();
      await request(app)
        .post(`/api/v1/resources/${resourceId}/ai-summary`)
        .set("Authorization", `Bearer ${downloadUserToken}`);

      const res = await request(app)
        .get(`/api/v1/resources/${resourceId}/ai-summary/download?format=docx`)
        .set("Authorization", `Bearer ${downloadUserToken}`)
        .buffer(true)
        .parse((response, callback) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => chunks.push(chunk));
          response.on("end", () => callback(null, Buffer.concat(chunks)));
        });

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      expect(res.headers["content-disposition"]).toContain("AI-Summary.docx");

      const buffer = res.body as Buffer;
      expect(buffer.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04])); // zip signature

      const extracted = await mammoth.extractRawText({ buffer });
      expect(extracted.value).toContain("Downloadable Word Resource");
      expect(extracted.value).toContain(VALID_SUMMARY.overview);
      expect(extracted.value).toContain("JomDekan");
      expect(extracted.value).toContain("This summary may contain mistakes");

      expect(mockGenerate).toHaveBeenCalledTimes(1);
    });
  });

  it("removes the summary when its resource is deleted (DB cascade)", async () => {
    if (skip) return;
    // A fresh user — ownerToken has already made close to its daily
    // generation budget's worth of real attempts earlier in this file.
    const deleteCascadeUser = await registerUser("delete-cascade");
    const resourceId = await createTextResource(deleteCascadeUser.token);
    mockOpenAiSuccess();
    await request(app)
      .post(`/api/v1/resources/${resourceId}/ai-summary`)
      .set("Authorization", `Bearer ${deleteCascadeUser.token}`);

    const before = await pool.query("SELECT id FROM resource_ai_summaries WHERE resource_id = $1", [resourceId]);
    expect(before.rowCount).toBeGreaterThan(0);

    await request(app)
      .delete(`/api/v1/resources/${resourceId}`)
      .set("Authorization", `Bearer ${deleteCascadeUser.token}`);

    const after = await pool.query("SELECT id FROM resource_ai_summaries WHERE resource_id = $1", [resourceId]);
    expect(after.rowCount).toBe(0);
  });

  it("never logs extracted document text or image data", async () => {
    if (skip) return;
    const infoSpy = jest.spyOn(logger, "info");
    const warnSpy = jest.spyOn(logger, "warn");
    const errorSpy = jest.spyOn(logger, "error");
    try {
      // A fresh user, so this generation is guaranteed to actually run
      // (not short-circuited by ownerToken's daily limit from earlier
      // tests) and so this test genuinely exercises extraction+logging.
      const loggingUser = await registerUser("no-log-leak");
      const secretMarker = `UNIQUE_MARKER_${Date.now()}`;
      const resourceId = await createTextResource(loggingUser.token, {
        description: `This description contains a secret marker: ${secretMarker}. It is long enough to summarize.`,
      });
      mockOpenAiSuccess();
      await request(app)
        .post(`/api/v1/resources/${resourceId}/ai-summary`)
        .set("Authorization", `Bearer ${loggingUser.token}`);

      const allLoggedArgs = JSON.stringify([...infoSpy.mock.calls, ...warnSpy.mock.calls, ...errorSpy.mock.calls]);
      expect(allLoggedArgs).not.toContain(secretMarker);
    } finally {
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});
