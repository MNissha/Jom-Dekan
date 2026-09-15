import mammoth from "mammoth";
import {
  buildSummaryDocumentViewModel,
  renderSummaryPdf,
  renderSummaryDocx,
  DISCLAIMER,
} from "../../src/services/resourceSummaryDocumentService";
import { extractPdfKitText } from "../helpers/extractPdfKitText";
import type { AiSummaryContent } from "../../src/types/aiSummary";

const SAMPLE_SUMMARY: AiSummaryContent = {
  overview: "This resource covers arrays, linked lists, and Big-O notation for CSC510 students.",
  keyPoints: ["Arrays give O(1) access.", "Linked lists give O(1) insertion at the head."],
  studySections: [{ heading: "Arrays vs Linked Lists", content: "A comparison of two fundamental structures." }],
  topics: ["Arrays", "Linked Lists", "Big-O Notation"],
  glossary: [{ term: "Big-O Notation", definition: "Describes the limiting behaviour of an algorithm's running time." }],
  limitations: ["The final chapter on trees was not included in the source."],
  language: "English",
};

function buildViewModel() {
  return buildSummaryDocumentViewModel({
    resourceTitle: "CSC510 Data Structures Notes",
    category: "NOTES",
    subjectName: "Data Structures and Algorithms",
    generatedAt: "2026-01-15T00:00:00.000Z",
    summary: SAMPLE_SUMMARY,
  });
}

describe("resourceSummaryDocumentService", () => {
  describe("renderSummaryPdf", () => {
    it("produces a well-formed PDF containing the resource title, summary content, branding, and disclaimer", async () => {
      const buffer = await renderSummaryPdf(buildViewModel());
      expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");

      const text = extractPdfKitText(buffer);
      expect(text).toContain("JomDekan");
      expect(text).toContain("CSC510 Data Structures Notes");
      expect(text).toContain("Data Structures and Algorithms");
      expect(text).toContain(SAMPLE_SUMMARY.overview);
      expect(text).toContain(SAMPLE_SUMMARY.keyPoints[0]);
      expect(text).toContain(SAMPLE_SUMMARY.studySections[0].heading);
      expect(text).toContain(SAMPLE_SUMMARY.glossary[0].term);
      expect(text).toContain(SAMPLE_SUMMARY.limitations[0]);
      expect(text).toContain(DISCLAIMER);
      expect(text).toContain("Page 1 of 1");
    });

    it("still renders a valid PDF for a summary with no glossary/limitations (e.g. a short-text summary)", async () => {
      const vm = buildSummaryDocumentViewModel({
        resourceTitle: "Short Note",
        category: "NOTES",
        subjectName: null,
        generatedAt: null,
        summary: {
          overview: "A short overview.",
          keyPoints: ["One point."],
          studySections: [],
          topics: [],
          glossary: [],
          limitations: ["The source was very short."],
          language: "English",
        },
      });
      const buffer = await renderSummaryPdf(vm);
      expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
      expect(extractPdfKitText(buffer)).toContain("A short overview.");
    });
  });

  describe("renderSummaryDocx", () => {
    it("produces a valid zip-based DOCX containing the expected content", async () => {
      const buffer = await renderSummaryDocx(buildViewModel());
      expect(buffer.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));

      const extracted = await mammoth.extractRawText({ buffer });
      expect(extracted.value).toContain("JomDekan");
      expect(extracted.value).toContain("CSC510 Data Structures Notes");
      expect(extracted.value).toContain(SAMPLE_SUMMARY.overview);
      expect(extracted.value).toContain(SAMPLE_SUMMARY.keyPoints[0]);
      expect(extracted.value).toContain(SAMPLE_SUMMARY.glossary[0].term);
      expect(extracted.value).toContain(SAMPLE_SUMMARY.glossary[0].definition);
      expect(extracted.value).toContain(DISCLAIMER);
    });
  });

  it("keeps PDF and DOCX content equivalent for the same view model", async () => {
    const vm = buildViewModel();
    const [pdfBuffer, docxBuffer] = await Promise.all([renderSummaryPdf(vm), renderSummaryDocx(vm)]);
    const pdfText = extractPdfKitText(pdfBuffer);
    const docxText = (await mammoth.extractRawText({ buffer: docxBuffer })).value;
    for (const mustContain of [vm.resourceTitle, SAMPLE_SUMMARY.overview, SAMPLE_SUMMARY.keyPoints[0], DISCLAIMER]) {
      expect(pdfText).toContain(mustContain);
      expect(docxText).toContain(mustContain);
    }
  });
});
