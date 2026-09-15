import {
  looksLikeHeading,
  segmentPdfPageLines,
  segmentParagraphText,
  splitBySentence,
  packSegmentsIntoChunks,
  chunkPlainText,
  MAX_CHUNK_CHARS,
} from "../../src/services/resourceChunkService";

describe("looksLikeHeading", () => {
  it("accepts short lines without terminal sentence punctuation", () => {
    expect(looksLikeHeading("Chapter 5: Database Normalization")).toBe(true);
    expect(looksLikeHeading("Formulas")).toBe(true);
  });

  it("rejects long lines, sentences, and bare numbers", () => {
    expect(looksLikeHeading("This is a full sentence that ends with a period.")).toBe(false);
    expect(looksLikeHeading("A".repeat(90))).toBe(false);
    expect(looksLikeHeading("42")).toBe(false);
    expect(looksLikeHeading("")).toBe(false);
  });
});

describe("segmentParagraphText", () => {
  it("splits on blank-line paragraph boundaries and attaches headings to subsequent paragraphs", () => {
    const text = [
      "Introduction",
      "",
      "This chapter introduces normalization concepts used throughout the course.",
      "",
      "Key Terms",
      "",
      "A candidate key uniquely identifies a row. A foreign key references another table's primary key.",
    ].join("\n");

    const segments = segmentParagraphText(text);
    expect(segments).toEqual([
      { heading: "Introduction", text: "This chapter introduces normalization concepts used throughout the course." },
      {
        heading: "Key Terms",
        text: "A candidate key uniquely identifies a row. A foreign key references another table's primary key.",
      },
    ]);
  });

  it("treats a paragraph with no preceding heading as heading:null", () => {
    const segments = segmentParagraphText("Just one plain paragraph with no heading before it.");
    expect(segments).toEqual([{ heading: null, text: "Just one plain paragraph with no heading before it." }]);
  });

  it("does not treat a genuine multi-line paragraph as a heading even if short", () => {
    const text = "Short line\nthat continues here.";
    const segments = segmentParagraphText(text);
    expect(segments[0].heading).toBeNull();
    expect(segments[0].text).toContain("Short line");
  });
});

describe("segmentPdfPageLines", () => {
  it("treats a short standalone line as a heading and groups subsequent lines under it, recognizing a second heading mid-page", () => {
    const pageText = [
      "Chapter 5: Database Normalization",
      "Normalization reduces redundancy and improves data integrity.",
      "Formulas",
      "The degree of a relation is the number of attributes.",
    ].join("\n");

    const segments = segmentPdfPageLines(pageText);
    expect(segments).toEqual([
      {
        heading: "Chapter 5: Database Normalization",
        text: "Normalization reduces redundancy and improves data integrity.",
      },
      { heading: "Formulas", text: "The degree of a relation is the number of attributes." },
    ]);
  });

  it("merges consecutive heading-candidate lines (a wrapped multi-line title) into one heading", () => {
    const pageText = ["Chapter Five", "Database Normalization", "Normalization reduces redundancy."].join("\n");
    const segments = segmentPdfPageLines(pageText);
    expect(segments).toEqual([
      { heading: "Chapter Five Database Normalization", text: "Normalization reduces redundancy." },
    ]);
  });

  it("returns a single null-heading segment when no line looks like a heading", () => {
    const pageText = "This is body text.\nIt continues across several lines.\nAnd a few more, still no heading.";
    const segments = segmentPdfPageLines(pageText);
    expect(segments).toHaveLength(1);
    expect(segments[0].heading).toBeNull();
  });
});

describe("splitBySentence", () => {
  it("splits a long paragraph at sentence boundaries without exceeding maxChars", () => {
    const sentences = Array.from({ length: 20 }, (_, i) => `This is sentence number ${i}.`);
    const text = sentences.join(" ");
    const pieces = splitBySentence(text, 100);
    for (const piece of pieces) {
      expect(piece.length).toBeLessThanOrEqual(100);
    }
    expect(pieces.join(" ")).toContain("sentence number 0");
    expect(pieces.join(" ")).toContain("sentence number 19");
  });

  it("hard-slices a single run with no sentence-ending punctuation at all", () => {
    const text = "word ".repeat(100).trim(); // no '.', '!' or '?' anywhere
    const pieces = splitBySentence(text, 50);
    expect(pieces.length).toBeGreaterThan(1);
    for (const piece of pieces) {
      expect(piece.length).toBeLessThanOrEqual(50);
    }
  });
});

describe("packSegmentsIntoChunks", () => {
  it("never splits a single segment that fits within the max size", () => {
    const chunks = packSegmentsIntoChunks([{ heading: "Intro", text: "A short paragraph." }]);
    expect(chunks).toEqual([{ sectionTitle: "Intro", content: "A short paragraph." }]);
  });

  it("starts a new chunk when the heading changes and the buffer already has enough content", () => {
    const longA = "Alpha content. ".repeat(60); // > MIN_CHUNK_CHARS
    const chunks = packSegmentsIntoChunks([
      { heading: "Section A", text: longA.trim() },
      { heading: "Section B", text: "Beta content." },
    ]);
    expect(chunks.length).toBe(2);
    expect(chunks[0].sectionTitle).toBe("Section A");
    expect(chunks[1].sectionTitle).toBe("Section B");
  });

  it("merges a short segment into the next section's chunk rather than leaving a tiny fragment, when under the minimum", () => {
    const chunks = packSegmentsIntoChunks([
      { heading: "Section A", text: "Tiny." },
      { heading: "Section B", text: "Also short." },
    ]);
    // Short content stays combined (heading change alone doesn't force a
    // split until the minimum size is reached) — one chunk, keyed by the
    // section active when it was flushed.
    expect(chunks.length).toBe(1);
  });

  it("never produces a chunk longer than MAX_CHUNK_CHARS even for one huge segment", () => {
    const huge = "This sentence repeats. ".repeat(200);
    const chunks = packSegmentsIntoChunks([{ heading: null, text: huge.trim() }]);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS);
    }
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("removes clearly empty input and produces no chunks", () => {
    expect(packSegmentsIntoChunks([])).toEqual([]);
    expect(packSegmentsIntoChunks([{ heading: null, text: "" }])).toEqual([]);
  });
});

describe("chunkPlainText", () => {
  it("always sets pageNumber to null for plain-text sources", () => {
    const chunks = chunkPlainText("Introduction\n\nSome body text about the subject matter here.");
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.pageNumber).toBeNull();
    }
  });

  it("preserves a detected heading as sectionTitle", () => {
    const chunks = chunkPlainText("Key Terms\n\nA candidate key uniquely identifies a row in a table.");
    expect(chunks[0].sectionTitle).toBe("Key Terms");
  });
});
