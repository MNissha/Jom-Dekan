import PDFDocument from "pdfkit";
import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import type { AiSummaryContent } from "../types/aiSummary";
import type { ResourceCategory } from "../models/resourceModel";

/**
 * Both renderers below consume this one view model and nothing else —
 * no storage keys, no database rows, no raw extracted document text.
 * Content parity between the PDF and DOCX downloads follows directly
 * from that: there is only one place a value could differ, and it isn't
 * either renderer.
 */
export interface SummaryDocumentViewModel {
  resourceTitle: string;
  categoryLabel: string;
  subjectName: string | null;
  generatedAtLabel: string;
  summary: AiSummaryContent;
}

export const DISCLAIMER =
  "AI-generated study aid. This summary may contain mistakes or omit important context. Verify important information using the original resource.";

const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  PAST_PAPER: "Past paper",
  NOTES: "Notes",
  SLIDES: "Slides",
  ARTICLE: "Article",
  EXCEL: "Excel",
  EXERCISES: "Exercises",
};

const COLORS = {
  navy: "#231C57",
  darkPurple: "#332475",
  indigo: "#4338CA",
  violet: "#6D5CE7",
  gold: "#F5C21A",
  paleViolet: "#EFEEFB",
  softBorder: "#ECEBF7",
  bodyText: "#334155",
  white: "#FFFFFF",
} as const;

// docx.js wants hex without the leading "#".
const HEX = (color: string) => color.replace("#", "");

export function buildSummaryDocumentViewModel(params: {
  resourceTitle: string;
  category: ResourceCategory;
  subjectName: string | null;
  generatedAt: string | null;
  summary: AiSummaryContent;
}): SummaryDocumentViewModel {
  const date = params.generatedAt ? new Date(params.generatedAt) : new Date();
  return {
    resourceTitle: params.resourceTitle,
    categoryLabel: CATEGORY_LABELS[params.category] ?? params.category,
    subjectName: params.subjectName,
    generatedAtLabel: date.toLocaleDateString("en-MY", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    summary: params.summary,
  };
}

// =====================================================================
// PDF (PDFKit) — deterministic, no remote fonts/images, A4 page.
// =====================================================================

const PAGE_MARGIN = 50;

export async function renderSummaryPdf(vm: SummaryDocumentViewModel): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // compress:false trades a slightly larger file for maximum
    // compatibility with PDF readers/tools (including older text
    // extractors) — there's no real downside for a short study-notes
    // document.
    const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, bufferPages: true, compress: false });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const contentWidth = doc.page.width - PAGE_MARGIN * 2;

    const ensureSpace = (minHeight: number) => {
      const bottom = doc.page.height - doc.page.margins.bottom;
      if (doc.y + minHeight > bottom) {
        doc.addPage();
      }
      doc.x = PAGE_MARGIN;
    };

    const sectionHeading = (text: string) => {
      ensureSpace(46);
      doc.moveDown(0.5);
      doc
        .fillColor(COLORS.indigo)
        .font("Helvetica-Bold")
        .fontSize(13)
        .text(text, PAGE_MARGIN, doc.y, { width: contentWidth });
      doc.moveDown(0.3);
      doc.x = PAGE_MARGIN;
    };

    // --- Header band -----------------------------------------------
    doc.rect(0, 0, doc.page.width, 88).fill(COLORS.navy);
    doc.rect(0, 88, doc.page.width, 4).fill(COLORS.gold);
    doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(20).text("JomDekan", PAGE_MARGIN, 26);
    doc.fillColor(COLORS.paleViolet).font("Helvetica").fontSize(11).text("AI Study Summary", PAGE_MARGIN, 54);

    doc.y = 112;
    doc.x = PAGE_MARGIN;

    // --- Title + metadata --------------------------------------------
    doc
      .fillColor(COLORS.navy)
      .font("Helvetica-Bold")
      .fontSize(17)
      .text(vm.resourceTitle, PAGE_MARGIN, doc.y, { width: contentWidth });

    const metaParts = [vm.categoryLabel, vm.subjectName, `Language: ${vm.summary.language}`].filter(
      Boolean,
    ) as string[];
    doc.moveDown(0.3);
    doc.fillColor(COLORS.bodyText).font("Helvetica").fontSize(10).text(metaParts.join("   ·   "), {
      width: contentWidth,
    });

    doc.moveDown(0.4);
    doc
      .fillColor(COLORS.violet)
      .font("Helvetica-BoldOblique")
      .fontSize(9)
      .text(`AI-GENERATED SUMMARY · Generated ${vm.generatedAtLabel}`, { width: contentWidth });

    doc.moveDown(0.4);
    doc.fillColor(COLORS.bodyText).font("Helvetica-Oblique").fontSize(8.5).text(DISCLAIMER, {
      width: contentWidth,
      lineGap: 1,
    });

    // --- Overview ------------------------------------------------------
    sectionHeading("Overview");
    doc.fillColor(COLORS.bodyText).font("Helvetica").fontSize(10.5).text(vm.summary.overview, PAGE_MARGIN, doc.y, {
      width: contentWidth,
      lineGap: 2,
    });
    doc.x = PAGE_MARGIN;

    // --- Key points ------------------------------------------------------
    if (vm.summary.keyPoints.length > 0) {
      sectionHeading("Key Points");
      for (const point of vm.summary.keyPoints) {
        ensureSpace(16);
        const bulletY = doc.y + 5;
        doc.fillColor(COLORS.gold).circle(PAGE_MARGIN + 3, bulletY, 2.5).fill();
        doc
          .fillColor(COLORS.bodyText)
          .font("Helvetica")
          .fontSize(10.5)
          .text(point, PAGE_MARGIN + 14, doc.y, { width: contentWidth - 14, lineGap: 2 });
        doc.moveDown(0.3);
        doc.x = PAGE_MARGIN;
      }
    }

    // --- Study sections ------------------------------------------------
    if (vm.summary.studySections.length > 0) {
      sectionHeading("Study Notes");
      for (const section of vm.summary.studySections) {
        ensureSpace(40);
        doc
          .fillColor(COLORS.darkPurple)
          .font("Helvetica-Bold")
          .fontSize(11)
          .text(section.heading, PAGE_MARGIN, doc.y, { width: contentWidth });
        doc.moveDown(0.15);
        doc
          .fillColor(COLORS.bodyText)
          .font("Helvetica")
          .fontSize(10.5)
          .text(section.content, PAGE_MARGIN, doc.y, { width: contentWidth, lineGap: 2 });
        doc.moveDown(0.5);
        doc.x = PAGE_MARGIN;
      }
    }

    // --- Topics (chips) --------------------------------------------------
    if (vm.summary.topics.length > 0) {
      sectionHeading("Topics");
      ensureSpace(30);
      let cx = PAGE_MARGIN;
      let cy = doc.y;
      const chipHeight = 20;
      doc.font("Helvetica").fontSize(9);
      for (const topic of vm.summary.topics) {
        const chipWidth = doc.widthOfString(topic) + 16;
        if (cx + chipWidth > PAGE_MARGIN + contentWidth) {
          cx = PAGE_MARGIN;
          cy += chipHeight + 6;
        }
        doc.roundedRect(cx, cy, chipWidth, chipHeight, 9).fill(COLORS.paleViolet);
        doc
          .fillColor(COLORS.indigo)
          .text(topic, cx + 8, cy + 5, { width: chipWidth - 16, lineBreak: false });
        cx += chipWidth + 8;
      }
      doc.y = cy + chipHeight + 12;
      doc.x = PAGE_MARGIN;
    }

    // --- Glossary --------------------------------------------------------
    if (vm.summary.glossary.length > 0) {
      sectionHeading("Glossary");
      for (const entry of vm.summary.glossary) {
        ensureSpace(28);
        doc
          .fillColor(COLORS.darkPurple)
          .font("Helvetica-Bold")
          .fontSize(9.5)
          .text(entry.term, PAGE_MARGIN, doc.y, { width: contentWidth, continued: false });
        doc
          .fillColor(COLORS.bodyText)
          .font("Helvetica")
          .fontSize(9.5)
          .text(entry.definition, PAGE_MARGIN, doc.y, { width: contentWidth, lineGap: 1 });
        doc
          .moveTo(PAGE_MARGIN, doc.y + 4)
          .lineTo(PAGE_MARGIN + contentWidth, doc.y + 4)
          .strokeColor(COLORS.softBorder)
          .lineWidth(0.5)
          .stroke();
        doc.moveDown(0.6);
        doc.x = PAGE_MARGIN;
      }
    }

    // --- Limitations (tinted panel) ---------------------------------------
    if (vm.summary.limitations.length > 0) {
      sectionHeading("Limitations & Notes");
      const boxPadding = 10;
      const textWidth = contentWidth - boxPadding * 2;
      doc.font("Helvetica").fontSize(9.5);
      const lineHeights = vm.summary.limitations.map(
        (item) => doc.heightOfString(`•  ${item}`, { width: textWidth, lineGap: 2 }) + 4,
      );
      const boxHeight = lineHeights.reduce((sum, h) => sum + h, 0) + boxPadding * 2;
      ensureSpace(Math.min(boxHeight, doc.page.height - doc.page.margins.top - doc.page.margins.bottom));
      const boxTop = doc.y;
      doc.roundedRect(PAGE_MARGIN, boxTop, contentWidth, boxHeight, 8).fill(COLORS.paleViolet);
      let lineY = boxTop + boxPadding;
      doc.fillColor(COLORS.darkPurple);
      for (const item of vm.summary.limitations) {
        doc.text(`•  ${item}`, PAGE_MARGIN + boxPadding, lineY, { width: textWidth, lineGap: 2 });
        lineY = doc.y + 4;
      }
      doc.y = boxTop + boxHeight + 10;
      doc.x = PAGE_MARGIN;
    }

    // --- Footer (page numbers + generation date on every page) -----------
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      const footerY = doc.page.height - PAGE_MARGIN + 12;
      doc
        .fillColor(COLORS.bodyText)
        .font("Helvetica")
        .fontSize(8)
        .text(`JomDekan AI Study Summary · ${vm.generatedAtLabel}`, PAGE_MARGIN, footerY, {
          width: contentWidth / 2,
          lineBreak: false,
        });
      doc.text(`Page ${i - range.start + 1} of ${range.count}`, PAGE_MARGIN + contentWidth / 2, footerY, {
        width: contentWidth / 2,
        align: "right",
        lineBreak: false,
      });
    }

    doc.end();
  });
}

// =====================================================================
// DOCX (docx package) — same view model, Word-native styling.
// =====================================================================

function chipRun(text: string): TextRun {
  return new TextRun({
    text: ` ${text} `,
    color: HEX(COLORS.indigo),
    shading: { type: ShadingType.CLEAR, fill: HEX(COLORS.paleViolet) },
    size: 18,
  });
}

function glossaryTable(entries: AiSummaryContent["glossary"]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: HEX(COLORS.paleViolet) },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Term", bold: true, color: HEX(COLORS.darkPurple), size: 20 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: HEX(COLORS.paleViolet) },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Definition", bold: true, color: HEX(COLORS.darkPurple), size: 20 })],
              }),
            ],
          }),
        ],
      }),
      ...entries.map(
        (entry) =>
          new TableRow({
            children: [
              new TableCell({
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: entry.term, bold: true, color: HEX(COLORS.darkPurple), size: 20 })],
                  }),
                ],
              }),
              new TableCell({
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: entry.definition, color: HEX(COLORS.bodyText), size: 20 })],
                  }),
                ],
              }),
            ],
          }),
      ),
    ],
  });
}

export async function renderSummaryDocx(vm: SummaryDocumentViewModel): Promise<Buffer> {
  const metaParts = [vm.categoryLabel, vm.subjectName, `Language: ${vm.summary.language}`].filter(
    Boolean,
  ) as string[];

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      shading: { type: ShadingType.CLEAR, fill: HEX(COLORS.navy) },
      spacing: { before: 60, after: 20 },
      children: [new TextRun({ text: "JomDekan", bold: true, color: HEX(COLORS.white), size: 40 })],
    }),
    new Paragraph({
      shading: { type: ShadingType.CLEAR, fill: HEX(COLORS.navy) },
      spacing: { after: 100 },
      children: [new TextRun({ text: "AI Study Summary", color: HEX(COLORS.paleViolet), size: 22 })],
    }),
    new Paragraph({
      shading: { type: ShadingType.CLEAR, fill: HEX(COLORS.gold) },
      spacing: { after: 200 },
      children: [new TextRun({ text: " ", size: 4 })],
    }),
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 80 },
      children: [new TextRun({ text: vm.resourceTitle, bold: true, color: HEX(COLORS.navy), size: 32 })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: metaParts.join("   ·   "), color: HEX(COLORS.bodyText), size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `AI-GENERATED SUMMARY · Generated ${vm.generatedAtLabel}`,
          bold: true,
          italics: true,
          color: HEX(COLORS.violet),
          size: 18,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 240 },
      children: [new TextRun({ text: DISCLAIMER, italics: true, color: HEX(COLORS.bodyText), size: 18 })],
    }),
    sectionHeadingParagraph("Overview"),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: vm.summary.overview, color: HEX(COLORS.bodyText), size: 22 })],
    }),
  ];

  if (vm.summary.keyPoints.length > 0) {
    children.push(sectionHeadingParagraph("Key Points"));
    for (const point of vm.summary.keyPoints) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: point, color: HEX(COLORS.bodyText), size: 22 })],
        }),
      );
    }
  }

  if (vm.summary.studySections.length > 0) {
    children.push(sectionHeadingParagraph("Study Notes"));
    for (const section of vm.summary.studySections) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [new TextRun({ text: section.heading, bold: true, color: HEX(COLORS.darkPurple), size: 22 })],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: section.content, color: HEX(COLORS.bodyText), size: 22 })],
        }),
      );
    }
  }

  if (vm.summary.topics.length > 0) {
    children.push(sectionHeadingParagraph("Topics"));
    const runs: TextRun[] = [];
    vm.summary.topics.forEach((topic, index) => {
      runs.push(chipRun(topic));
      if (index < vm.summary.topics.length - 1) runs.push(new TextRun({ text: "  " }));
    });
    children.push(new Paragraph({ spacing: { after: 200 }, children: runs }));
  }

  if (vm.summary.glossary.length > 0) {
    children.push(sectionHeadingParagraph("Glossary"));
    children.push(glossaryTable(vm.summary.glossary));
    children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  }

  if (vm.summary.limitations.length > 0) {
    children.push(sectionHeadingParagraph("Limitations & Notes"));
    for (const item of vm.summary.limitations) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          shading: { type: ShadingType.CLEAR, fill: HEX(COLORS.paleViolet) },
          spacing: { after: 60 },
          children: [new TextRun({ text: item, color: HEX(COLORS.darkPurple), size: 20 })],
        }),
      );
    }
  }

  const document = new Document({
    sections: [
      {
        properties: {},
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `JomDekan AI Study Summary · ${vm.generatedAtLabel} · Page `,
                    size: 16,
                    color: HEX(COLORS.bodyText),
                  }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: HEX(COLORS.bodyText) }),
                  new TextRun({ text: " of ", size: 16, color: HEX(COLORS.bodyText) }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: HEX(COLORS.bodyText) }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}

function sectionHeadingParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 160, after: 100 },
    children: [new TextRun({ text, bold: true, color: HEX(COLORS.indigo), size: 26 })],
  });
}
