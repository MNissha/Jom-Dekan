/**
 * A minimal, purpose-built text extractor for our own PDFKit output —
 * NOT a general-purpose PDF parser. pdfkit (with `compress: false`, set
 * in resourceSummaryDocumentService) writes text-showing operators as
 * `TJ` arrays of hex-encoded glyph strings interleaved with kerning
 * numbers, e.g. `[<48656c6c6f> -20 <20776f726c64>] TJ` — concatenating
 * every hex run in encounter order reconstructs the original text
 * (the numbers are just spacing adjustments, not content).
 *
 * This exists because pdf-parse's old bundled pdf.js proved unreliable
 * against pdfkit's own output in this environment (inconsistent/wrong
 * results across repeated calls in one process — see the AI-summary
 * feature's test notes). Verifying our own renderer's output doesn't
 * need a real PDF parser: we fully control the input format.
 */
export function extractPdfKitText(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const hexGroups = raw.match(/<[0-9A-Fa-f]+>/g) ?? [];
  return hexGroups.map((group) => Buffer.from(group.slice(1, -1), "hex").toString("latin1")).join("");
}
