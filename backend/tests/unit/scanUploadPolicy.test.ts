jest.mock("../../src/models/auditLogModel", () => ({
  auditLogModel: { record: jest.fn().mockResolvedValue(undefined) },
}));

import { scanUpload, scanUploadOrThrow } from "../../src/services/malwareScanner";
import { EICAR_TEST_STRING } from "../../src/services/malwareScanner/stubScanner";
import { AppError } from "../../src/types/errors";
import { env } from "../../src/config/config/env";
import { auditLogModel } from "../../src/models/auditLogModel";

const mockRecord = auditLogModel.record as jest.Mock;

type MalwareScanEnv = typeof env.malwareScan;
const original: MalwareScanEnv = { ...env.malwareScan, clamav: { ...env.malwareScan.clamav } };

function setMalwareScanEnv(overrides: Partial<MalwareScanEnv>) {
  Object.assign(env.malwareScan, overrides);
}

afterEach(() => {
  setMalwareScanEnv(original);
  env.malwareScan.clamav.host = original.clamav.host;
  env.malwareScan.clamav.port = original.clamav.port;
  mockRecord.mockClear();
});

const CLEAN_INPUT = { buffer: Buffer.from("just an ordinary file"), filename: "f.pdf", mimeType: "application/pdf" };
const INFECTED_INPUT = { buffer: Buffer.from(EICAR_TEST_STRING), filename: "eicar.txt", mimeType: "text/plain" };
const CTX = { targetType: "test_target", targetId: "t-1", requestId: "req-1", actorUserId: "u-1" } as const;

describe("scanUpload (stub provider)", () => {
  beforeEach(() => setMalwareScanEnv({ provider: "stub" }));

  it("returns 'clean' for an ordinary file and does not write an audit record", async () => {
    const result = await scanUpload(CLEAN_INPUT, CTX);
    expect(result).toEqual({ outcome: "clean" });
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it("returns 'infected' with a threat name for the EICAR marker, and audits it", async () => {
    const result = await scanUpload(INFECTED_INPUT, CTX);
    expect(result).toEqual({ outcome: "infected", threatName: "Eicar-Test-Signature" });
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MALWARE_SCAN_INFECTED", targetType: "test_target", targetId: "t-1" }),
    );
  });
});

describe("scanUpload (scanner unavailable)", () => {
  beforeEach(() => {
    // Point at a ClamAV that isn't there — real connection failure, not a mock.
    setMalwareScanEnv({ provider: "clamav" });
    env.malwareScan.clamav.host = "127.0.0.1";
    env.malwareScan.clamav.port = 1; // never a real listener in a test environment
    env.malwareScan.timeoutMs = 500;
  });

  it("returns 'unavailable' and audits MALWARE_SCAN_FAILED", async () => {
    const result = await scanUpload(CLEAN_INPUT, CTX);
    expect(result).toEqual({ outcome: "unavailable" });
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MALWARE_SCAN_FAILED", targetType: "test_target" }),
    );
  });
});

describe("scanUploadOrThrow", () => {
  it("resolves without throwing for a clean file", async () => {
    setMalwareScanEnv({ provider: "stub" });
    await expect(scanUploadOrThrow(CLEAN_INPUT, CTX)).resolves.toBeUndefined();
  });

  it("throws a generic 400 AppError for an infected file, never the exact threat name", async () => {
    setMalwareScanEnv({ provider: "stub" });
    await expect(scanUploadOrThrow(INFECTED_INPUT, CTX)).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
    });
    try {
      await scanUploadOrThrow(INFECTED_INPUT, CTX);
    } catch (err) {
      expect((err as AppError).message).not.toContain("Eicar");
    }
  });

  it("throws a 503 when the scanner is unavailable and MALWARE_SCAN_REQUIRED=true", async () => {
    setMalwareScanEnv({ provider: "clamav", required: true });
    env.malwareScan.clamav.host = "127.0.0.1";
    env.malwareScan.clamav.port = 1;
    env.malwareScan.timeoutMs = 500;

    await expect(scanUploadOrThrow(CLEAN_INPUT, CTX)).rejects.toMatchObject({
      status: 503,
      code: "SERVICE_UNAVAILABLE",
    });
  });

  it("does not throw when the scanner is unavailable and MALWARE_SCAN_REQUIRED=false (fail open)", async () => {
    setMalwareScanEnv({ provider: "clamav", required: false });
    env.malwareScan.clamav.host = "127.0.0.1";
    env.malwareScan.clamav.port = 1;
    env.malwareScan.timeoutMs = 500;

    await expect(scanUploadOrThrow(CLEAN_INPUT, CTX)).resolves.toBeUndefined();
  });
});
