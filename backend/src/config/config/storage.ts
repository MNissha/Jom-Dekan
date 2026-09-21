import { mkdirSync } from "fs";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { dirname, join } from "path";
import jwt from "jsonwebtoken";
import { env } from "./env";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Object storage adapter seam. Milestone 3 (secure resource files)
 * implements a real local-filesystem client behind this interface for
 * dev use (no cloud account configured for this project); a real
 * S3-compatible client (Supabase Storage / S3 / R2) is a later drop-in
 * swap behind the same interface, unchanged.
 */
export interface StorageAdapter {
  readonly provider: string;
  createUploadIntent(
    _key: string,
    _contentType: string,
  ): Promise<{ uploadUrl: string; key: string }>;
  createSignedDownloadUrl(
    _key: string,
    _expiresInSeconds: number,
  ): Promise<string>;
  putObject(_key: string, _body: Buffer, _contentType: string): Promise<void>;
  getObject(_key: string): Promise<Buffer>;
  deleteObject(_key: string): Promise<void>;
}

class LocalStubStorageAdapter implements StorageAdapter {
  readonly provider = "local-stub";

  async createUploadIntent(): Promise<{ uploadUrl: string; key: string }> {
    throw new Error(
      "STORAGE_NOT_CONFIGURED: local-stub storage cannot issue real upload intents. " +
        "Set STORAGE_PROVIDER=local-fs for local dev, or s3/supabase in production.",
    );
  }

  async createSignedDownloadUrl(): Promise<string> {
    throw new Error(
      "STORAGE_NOT_CONFIGURED: no real object storage is wired up yet.",
    );
  }

  async putObject(): Promise<void> {
    throw new Error("STORAGE_NOT_CONFIGURED");
  }
  async getObject(): Promise<Buffer> {
    throw new Error("STORAGE_NOT_CONFIGURED");
  }
  async deleteObject(): Promise<void> {
    throw new Error("STORAGE_NOT_CONFIGURED");
  }
}

interface StorageTokenPayload {
  key: string;
  purpose: "upload" | "download";
}

/**
 * Dev-only storage backend: files live on the local filesystem under
 * STORAGE_LOCAL_ROOT. Upload/download URLs are routes on this same app
 * gated by a short-lived signed token (see storageTokenMiddleware),
 * mirroring the shape of a real S3 presigned URL closely enough that
 * swapping in a real S3Adapter later requires no caller-side changes —
 * only this class and getStorageAdapter()'s switch change.
 */
class LocalFsStorageAdapter implements StorageAdapter {
  readonly provider = "local-fs";

  constructor() {
    mkdirSync(env.storage.localRoot, { recursive: true });
  }

  async createUploadIntent(
    key: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; key: string }> {
    const token = jwt.sign(
      { key, contentType, purpose: "upload" } satisfies StorageTokenPayload & {
        contentType: string;
      },
      env.storage.signingSecret,
      { expiresIn: env.resources.uploadTokenTtlSeconds, algorithm: "HS256" },
    );
    return { uploadUrl: `/api/v1/resources/files/upload?token=${token}`, key };
  }

  async putObject(key: string, body: Buffer): Promise<void> {
    const objectPath = join(env.storage.localRoot, key);
    await mkdir(dirname(objectPath), { recursive: true });
    await writeFile(objectPath, body);
  }

  async getObject(key: string): Promise<Buffer> {
    return readFile(join(env.storage.localRoot, key));
  }

  async deleteObject(key: string): Promise<void> {
    await unlink(join(env.storage.localRoot, key)).catch(() => undefined);
  }

  async createSignedDownloadUrl(
    key: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const token = jwt.sign(
      { key, purpose: "download" } satisfies StorageTokenPayload,
      env.storage.signingSecret,
      {
        expiresIn: expiresInSeconds,
        algorithm: "HS256",
      },
    );
    return `/api/v1/resources/files/download?token=${token}`;
  }
}

class S3StorageAdapter implements StorageAdapter {
  readonly provider = "s3";
  private readonly client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: env.storage.region,
      endpoint: env.storage.endpoint || undefined,
      forcePathStyle: Boolean(env.storage.endpoint),
      credentials: {
        accessKeyId: env.storage.accessKeyId,
        secretAccessKey: env.storage.secretAccessKey,
      },
    });
  }

  async createUploadIntent(
    key: string,
    _contentType: string,
  ): Promise<{ uploadUrl: string; key: string }> {
    const token = jwt.sign(
      { key, purpose: "upload" } satisfies StorageTokenPayload,
      env.storage.signingSecret,
      { expiresIn: env.resources.uploadTokenTtlSeconds, algorithm: "HS256" },
    );
    return { uploadUrl: `/api/v1/resources/files/upload?token=${token}`, key };
  }

  async createSignedDownloadUrl(
    key: string,
    expiresInSeconds: number,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: env.storage.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: env.storage.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async getObject(key: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: env.storage.bucket, Key: key }),
    );
    if (!result.Body) throw new Error("Object body was empty.");
    return Buffer.from(await result.Body.transformToByteArray());
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: env.storage.bucket, Key: key }),
    );
  }
}

// For an upload that doesn't go through the resource pipeline (e.g. a
// tutor's resume) — same signed-token shape createUploadIntent uses
// internally, just not hardcoded to /resources/files/upload as the
// destination. The caller builds its own upload URL around this token,
// pointed at its own token-gated PUT route.
export function signUploadToken(key: string, expiresInSeconds: number): string {
  return jwt.sign(
    { key, purpose: "upload" } satisfies StorageTokenPayload,
    env.storage.signingSecret,
    { expiresIn: expiresInSeconds, algorithm: "HS256" },
  );
}

export function verifyStorageToken(
  token: string,
  expectedPurpose: "upload" | "download",
): { key: string } {
  const decoded = jwt.verify(token, env.storage.signingSecret, {
    algorithms: ["HS256"],
  }) as StorageTokenPayload;
  if (decoded.purpose !== expectedPurpose) {
    throw new Error("STORAGE_TOKEN_WRONG_PURPOSE");
  }
  return { key: decoded.key };
}

export function getStorageAdapter(): StorageAdapter {
  switch (env.storage.provider) {
    case "local-fs":
      return new LocalFsStorageAdapter();
    case "s3":
    case "supabase":
      return new S3StorageAdapter();
    case "local-stub":
    default:
      return new LocalStubStorageAdapter();
  }
}
