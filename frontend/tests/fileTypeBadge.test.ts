import { describe, it, expect } from "vitest";
import { fileTypeBadge } from "../src/utils/fileTypeBadge";
import type { ResourceListItem } from "../src/types/resource";

function baseItem(overrides: Partial<ResourceListItem> = {}): ResourceListItem {
  return {
    id: "r1",
    ownerId: "u1",
    universityId: null,
    facultyId: null,
    programmeId: null,
    subjectId: null,
    title: "Resource",
    description: null,
    category: "NOTES",
    status: "READY",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    readyFileId: null,
    readyFileMimeType: null,
    ownerName: null,
    ...overrides,
  };
}

describe("fileTypeBadge", () => {
  it("shows TEXT for a text-only resource (no ready files)", () => {
    const badge = fileTypeBadge(baseItem({ readyFileCount: 0, readyFileTypes: [], fileTypeDisplay: "TEXT" }));
    expect(badge.label).toBe("TEXT");
  });

  it("shows the normalized type for exactly one READY file", () => {
    const badge = fileTypeBadge(baseItem({ readyFileCount: 1, readyFileTypes: ["PDF"], fileTypeDisplay: "PDF" }));
    expect(badge.label).toBe("PDF");
  });

  it("shows type + count for multiple READY files of the same type", () => {
    const badge = fileTypeBadge(baseItem({ readyFileCount: 3, readyFileTypes: ["PDF"], fileTypeDisplay: "PDF" }));
    expect(badge.label).toBe("PDF · 3 files");
  });

  it("shows MULTI-FILE + count for several READY files of different types", () => {
    const badge = fileTypeBadge(
      baseItem({ readyFileCount: 3, readyFileTypes: ["PDF", "DOCX", "PNG"], fileTypeDisplay: "MULTI-FILE" }),
    );
    expect(badge.label).toBe("MULTI-FILE · 3 files");
  });

  it("falls back to the legacy single-file fields when the aggregation fields are absent", () => {
    const badge = fileTypeBadge(
      baseItem({ readyFileId: "f1", readyFileMimeType: "application/pdf", fileTypeDisplay: undefined }),
    );
    expect(badge.label).toBe("PDF");
  });

  it("falls back to TEXT (legacy shape) when there's no ready file and no aggregation fields", () => {
    const badge = fileTypeBadge(baseItem({ readyFileId: null, readyFileMimeType: null, fileTypeDisplay: undefined }));
    expect(badge.label).toBe("TEXT");
  });
});
