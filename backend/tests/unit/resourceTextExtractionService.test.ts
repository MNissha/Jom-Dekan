import { env } from "../../src/config/config/env";
import {
  resourceTextExtractionService,
  normalizeWhitespace,
  hashTextResource,
  isSummarizableMimeType,
  isImageMimeType,
} from "../../src/services/resourceTextExtractionService";
import { getStorageAdapter } from "../../src/config/config/storage";
import type { ResourceFileRow } from "../../src/models/resourceModel";
import pdfParse from "pdf-parse";

jest.mock("../../src/config/config/storage");
// pdf-parse's own parsing correctness is out of scope for this unit
// suite — mocking it tests *our* extraction/validation logic (mime
// gating, size limits, the minimum-meaningful-content threshold, the
// unhandled-rejection safety net) in isolation from the third-party
// library's own (old, occasionally flaky) PDF parser.
// An explicit factory, not a bare `jest.mock("pdf-parse")`: automocking
// would still `require()` the real module once to learn its shape, and
// pdf-parse's own index.js has a debug-mode code path (triggered when it
// can't detect a parent module — which is exactly how Jest's automocker
// loads it) that tries to read a sample PDF fixture that doesn't ship in
// the published package, crashing the whole test file before any test
// runs. A factory sidesteps loading the real module entirely.
jest.mock("pdf-parse", () => jest.fn());

const mockGetStorageAdapter = getStorageAdapter as jest.MockedFunction<typeof getStorageAdapter>;
const mockPdfParse = pdfParse as jest.MockedFunction<typeof pdfParse>;

function makeFile(overrides: Partial<ResourceFileRow> = {}): ResourceFileRow {
  return {
    id: "file-1",
    resource_id: "resource-1",
    storage_key: "key-1",
    original_filename: "test.pdf",
    declared_mime_type: "application/pdf",
    detected_mime_type: "application/pdf",
    size_bytes: "1000",
    checksum_sha256: "abc123",
    status: "READY",
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

describe("normalizeWhitespace", () => {
  it("collapses runs of whitespace and trims", () => {
    expect(normalizeWhitespace("  hello   \n\n world  ")).toBe("hello world");
  });
});

describe("hashTextResource", () => {
  it("is stable across whitespace-only differences", () => {
    expect(hashTextResource("Title", "Description")).toBe(hashTextResource(" Title ", "  Description  "));
  });

  it("changes when the title or description actually changes", () => {
    expect(hashTextResource("Title", "A")).not.toBe(hashTextResource("Title", "B"));
    expect(hashTextResource("Title A", "Same")).not.toBe(hashTextResource("Title B", "Same"));
  });
});

describe("isSummarizableMimeType / isImageMimeType", () => {
  it("supports pdf, docx, png, jpeg only", () => {
    expect(isSummarizableMimeType("application/pdf")).toBe(true);
    expect(
      isSummarizableMimeType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ).toBe(true);
    expect(isSummarizableMimeType("image/png")).toBe(true);
    expect(isSummarizableMimeType("image/jpeg")).toBe(true);
  });

  it("rejects xlsx/pptx and unknown types", () => {
    expect(isSummarizableMimeType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe(
      false,
    );
    expect(
      isSummarizableMimeType("application/vnd.openxmlformats-officedocument.presentationml.presentation"),
    ).toBe(false);
    expect(isSummarizableMimeType("text/plain")).toBe(false);
    expect(isSummarizableMimeType(null)).toBe(false);
    expect(isSummarizableMimeType(undefined)).toBe(false);
  });

  it("classifies only png/jpeg as images", () => {
    expect(isImageMimeType("image/png")).toBe(true);
    expect(isImageMimeType("image/jpeg")).toBe(true);
    expect(isImageMimeType("application/pdf")).toBe(false);
    expect(isImageMimeType(null)).toBe(false);
  });
});

describe("extractFromTextResource", () => {
  it("throws INSUFFICIENT_CONTENT below the minimum meaningful-character threshold", async () => {
    await expect(resourceTextExtractionService.extractFromTextResource("Hi", "ok")).rejects.toMatchObject({
      code: "INSUFFICIENT_CONTENT",
    });
  });

  it("does not fabricate content for genuinely short (but sufficient) text — classified as the SHORT tier", async () => {
    const result = await resourceTextExtractionService.extractFromTextResource("Title", "A".repeat(50));
    expect(result.lengthTier).toBe("SHORT");
    expect(result.sourceType).toBe("TEXT_RESOURCE");
    expect(result.truncated).toBe(false);
  });

  it("classifies long content as the FULL tier", async () => {
    const result = await resourceTextExtractionService.extractFromTextResource("Title", "A".repeat(300));
    expect(result.lengthTier).toBe("FULL");
  });

  it("truncates content longer than AI_SUMMARY_MAX_INPUT_CHARACTERS and reports truncation", async () => {
    const original = env.aiSummary.maxInputCharacters;
    env.aiSummary.maxInputCharacters = 50;
    try {
      const result = await resourceTextExtractionService.extractFromTextResource("Title", "B".repeat(200));
      expect(result.truncated).toBe(true);
      expect(result.text.length).toBe(50);
    } finally {
      env.aiSummary.maxInputCharacters = original;
    }
  });
});

describe("extractFromFile", () => {
  beforeEach(() => {
    mockGetStorageAdapter.mockReset();
  });

  it("throws UNSUPPORTED_MIME_TYPE for an xlsx file without reading its bytes", async () => {
    const getObject = jest.fn();
    mockGetStorageAdapter.mockReturnValue({ getObject } as never);
    const file = makeFile({
      detected_mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    await expect(resourceTextExtractionService.extractFromFile(file)).rejects.toMatchObject({
      code: "UNSUPPORTED_MIME_TYPE",
    });
    expect(getObject).not.toHaveBeenCalled();
  });

  it("throws INSUFFICIENT_CONTENT for a PDF with no extractable text (e.g. scanned/garbled)", async () => {
    mockPdfParse.mockRejectedValueOnce(new Error("Invalid PDF structure"));
    mockGetStorageAdapter.mockReturnValue({
      getObject: jest.fn().mockResolvedValue(Buffer.from("%PDF-1.4 not actually a valid pdf structure")),
    } as never);
    const file = makeFile();
    await expect(resourceTextExtractionService.extractFromFile(file)).rejects.toMatchObject({
      code: "INSUFFICIENT_CONTENT",
    });
  });

  it("extracts real text from a readable PDF and reports the FULL length tier", async () => {
    const longText = "Data structures and algorithms. ".repeat(20);
    mockPdfParse.mockResolvedValueOnce({ text: longText } as Awaited<ReturnType<typeof pdfParse>>);
    mockGetStorageAdapter.mockReturnValue({
      getObject: jest.fn().mockResolvedValue(Buffer.from("%PDF-1.4 pretend real content")),
    } as never);
    const file = makeFile();
    const result = await resourceTextExtractionService.extractFromFile(file);
    expect(result.kind).toBe("text");
    if (result.kind === "text") {
      expect(result.sourceType).toBe("EXTRACTED_DOCUMENT");
      expect(result.lengthTier).toBe("FULL");
      expect(result.text).toContain("Data structures and algorithms.");
    }
  });

  it("throws IMAGE_TOO_LARGE for an image over the configured size limit, without reading its bytes", async () => {
    const getObject = jest.fn();
    mockGetStorageAdapter.mockReturnValue({ getObject } as never);
    const file = makeFile({
      detected_mime_type: "image/png",
      size_bytes: String(env.aiSummary.maxImageSizeBytes + 1),
    });
    await expect(resourceTextExtractionService.extractFromFile(file)).rejects.toMatchObject({
      code: "IMAGE_TOO_LARGE",
    });
    expect(getObject).not.toHaveBeenCalled();
  });

  it("returns an in-memory base64 image payload for a small PNG, without ever writing a temp file", async () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2, 3]);
    mockGetStorageAdapter.mockReturnValue({
      getObject: jest.fn().mockResolvedValue(pngBuffer),
    } as never);
    const file = makeFile({ detected_mime_type: "image/png", size_bytes: String(pngBuffer.length) });
    const result = await resourceTextExtractionService.extractFromFile(file);
    expect(result.kind).toBe("image");
    if (result.kind === "image") {
      expect(result.mimeType).toBe("image/png");
      expect(result.base64.length).toBeGreaterThan(0);
      expect(Buffer.from(result.base64, "base64").subarray(0, 4)).toEqual(pngBuffer.subarray(0, 4));
    }
  });
});
