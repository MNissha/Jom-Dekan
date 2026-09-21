/**
 * Content-based file type detection via magic bytes — never trust a
 * client-declared Content-Type or a filename extension. Covers PDFs/
 * images by a fixed byte prefix, plus modern Office documents (.docx/
 * .xlsx/.pptx), which are all ZIP containers sharing the same outer
 * signature — those are told apart by checking for the presence of
 * their format-specific internal path ("word/", "xl/", "ppt/") as a
 * literal ASCII substring, which appears uncompressed in a ZIP's
 * filename entries. This never decompresses anything (no zip-bomb
 * exposure), it only scans the raw bytes already read into memory.
 * Hand-rolled instead of the `file-type` npm package: that package is
 * pure ESM from v17+ and this backend is CommonJS (ts-jest default),
 * so pulling it in risks require() failures for no real benefit given
 * this fixed, small allowlist.
 */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const SIGNATURES: Array<{ mimeType: AllowedMimeType; bytes: number[] }> = [
  { mimeType: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // "%PDF-"
  { mimeType: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mimeType: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
];

// Every OOXML format (.docx/.xlsx/.pptx, also .zip itself) starts with
// this local-file-header signature — it only proves "this is a ZIP",
// not which Office format it is.
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];

const OOXML_MARKERS: Array<{ mimeType: AllowedMimeType; marker: string }> = [
  {
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    marker: 'word/',
  },
  {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    marker: 'xl/',
  },
  {
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    marker: 'ppt/',
  },
];

function matches(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (buffer[i] !== signature[i]) return false;
  }
  return true;
}

/** Returns the detected MIME type, or null if the bytes match nothing on the allowlist. */
export function detectFileType(buffer: Buffer): AllowedMimeType | null {
  for (const { mimeType, bytes } of SIGNATURES) {
    if (matches(buffer, bytes)) return mimeType;
  }

  if (matches(buffer, ZIP_SIGNATURE)) {
    for (const { mimeType, marker } of OOXML_MARKERS) {
      if (buffer.includes(marker, 0, 'ascii')) return mimeType;
    }
  }

  return null;
}

export function isAllowedMimeType(value: string): value is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

// --- Additional signatures for upload paths outside the resource
// allowlist above (report screenshots, opportunity CV/portfolio) —
// kept separate from ALLOWED_MIME_TYPES/detectFileType/isAllowedMimeType
// so resource uploads' behavior is entirely unchanged by these.

const WEBP_RIFF = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
// Legacy pre-2007 Office binary format (.doc/.xls/.ppt) — an OLE
// Compound File; opportunity applications' CV field has always accepted
// application/msword alongside pdf/docx/images (see opportunityRoutes.ts).
const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

export type ImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

/** Report screenshot evidence only ever needs to be an image — jpeg/png (shared with detectFileType) plus webp, which resources don't accept. */
export function detectImageMimeType(buffer: Buffer): ImageMimeType | null {
  const detected = detectFileType(buffer);
  if (detected === 'image/jpeg' || detected === 'image/png') return detected;
  if (matches(buffer, WEBP_RIFF) && buffer.length >= 12 && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

export type OpportunityFileMimeType = AllowedMimeType | 'application/msword';

/** Opportunity CV/portfolio uploads: same shape as the resource allowlist (pdf/docx/jpeg/png), plus legacy .doc. */
export function detectOpportunityFileMimeType(buffer: Buffer): OpportunityFileMimeType | null {
  const detected = detectFileType(buffer);
  if (
    detected === 'application/pdf' ||
    detected === 'image/jpeg' ||
    detected === 'image/png' ||
    detected === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return detected;
  }
  if (matches(buffer, OLE_SIGNATURE)) return 'application/msword';
  return null;
}
