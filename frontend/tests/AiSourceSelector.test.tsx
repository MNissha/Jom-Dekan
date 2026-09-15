import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AiSourceSelector } from "../src/components/resource/AiSourceSelector";
import type { AiSourceDescriptor } from "../src/types/resourceSummary";

const SOURCES: AiSourceDescriptor[] = [
  { resourceFileId: "pdf-1", filename: "Lecture Notes.pdf", fileType: "PDF", supported: true, recommended: true },
  { resourceFileId: "docx-1", filename: "Tutorial Answers.docx", fileType: "DOCX", supported: true, recommended: false },
  { resourceFileId: "xlsx-1", filename: "Spreadsheet.xlsx", fileType: "XLSX", supported: false, recommended: false },
];

describe("AiSourceSelector", () => {
  it("renders nothing for a single (or zero) available source", () => {
    const { container } = render(
      <AiSourceSelector availableSources={[SOURCES[0]]} selectedFileId="pdf-1" onSelect={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a radio group with all sources and marks the recommended one", () => {
    render(<AiSourceSelector availableSources={SOURCES} selectedFileId="pdf-1" onSelect={vi.fn()} />);

    expect(screen.getByRole("radiogroup", { name: /ai analysis source/i })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByText(/recommended/i)).toBeInTheDocument();
  });

  it("disables the radio for an unsupported file and marks it clearly", () => {
    render(<AiSourceSelector availableSources={SOURCES} selectedFileId="pdf-1" onSelect={vi.fn()} />);

    const xlsxRadio = screen.getByRole("radio", { name: /spreadsheet\.xlsx/i });
    expect(xlsxRadio).toBeDisabled();
    expect(screen.getByText(/unsupported for ai/i)).toBeInTheDocument();
  });

  it("calls onSelect with the file id when a supported option is chosen (keyboard-accessible radio)", () => {
    const onSelect = vi.fn();
    render(<AiSourceSelector availableSources={SOURCES} selectedFileId="pdf-1" onSelect={onSelect} />);

    const docxRadio = screen.getByRole("radio", { name: /tutorial answers\.docx/i });
    fireEvent.click(docxRadio);
    expect(onSelect).toHaveBeenCalledWith("docx-1");
  });

  it("reflects the currently selected file as checked", () => {
    render(<AiSourceSelector availableSources={SOURCES} selectedFileId="docx-1" onSelect={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /tutorial answers\.docx/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /lecture notes\.pdf/i })).not.toBeChecked();
  });
});
