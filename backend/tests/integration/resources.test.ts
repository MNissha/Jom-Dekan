import request from "supertest";
import { createApp } from "../../src/app";
import { pool } from "../../src/config/config/db";
import { userModel } from "../../src/models/userModel";
import {
  seededTaxonomy,
  baseRegisterPayload,
} from "../helpers/registerPayload";

const app = createApp();

const PDF_BUFFER = Buffer.from("%PDF-1.4\nfake pdf content for tests\n%%EOF");
const PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02, 0x03,
]);
const NOT_A_REAL_FILE_BUFFER = Buffer.from(
  "just plain text, not a pdf/png/jpeg at all",
);

async function dbReachable(): Promise<boolean> {
  try {
    await pool.query("SELECT 1 FROM resources LIMIT 1");
    return true;
  } catch {
    return false;
  }
}

async function registerUser(label: string) {
  const taxonomy = await seededTaxonomy();
  if (!taxonomy) {
    throw new Error(
      "Run `npm run seed` against the test database before running this suite.",
    );
  }
  const email = `resources-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send(baseRegisterPayload(taxonomy, { email, displayName: label }));
  if (!res.body.accessToken) {
    throw new Error(
      `registerUser("${label}") failed: ${JSON.stringify(res.body)}`,
    );
  }
  return {
    email,
    token: res.body.accessToken as string,
    id: res.body.user.id as string,
  };
}

async function createUploadIntent(
  token: string,
  overrides: Partial<Record<string, unknown>> = {},
) {
  return request(app)
    .post("/api/v1/resources/upload-intent")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: `Test Resource ${Date.now()}`,
      fileName: "notes.pdf",
      contentType: "application/pdf",
      sizeBytes: PDF_BUFFER.length,
      category: "NOTES", // ← ADD THIS LINE
      ...overrides,
    });
}

async function uploadAndConfirm(
  token: string,
  buffer: Buffer = PDF_BUFFER,
  overrides: Partial<Record<string, unknown>> = {},
) {
  const intentRes = await createUploadIntent(token, {
    sizeBytes: buffer.length,
    ...overrides,
  });
  const { uploadUrl } = intentRes.body.data;
  const fileId = intentRes.body.data.file.id;
  const resourceId = intentRes.body.data.resource.id;

  const uploadRes = await request(app)
    .put(uploadUrl)
    .set("Authorization", `Bearer ${token}`)
    .attach("file", buffer, "notes.pdf");

  const confirmRes = await request(app)
    .post(`/api/v1/resources/files/${fileId}/confirm`)
    .set("Authorization", `Bearer ${token}`);

  return { intentRes, uploadRes, confirmRes, fileId, resourceId, uploadUrl };
}

describe("Resources API", () => {
  let skip = false;
  let ownerAToken = "";
  let ownerBToken = "";
  let adminToken = "";

  beforeAll(async () => {
    skip = !(await dbReachable());
    if (skip) return;

    const ownerA = await registerUser("owner-a");
    ownerAToken = ownerA.token;

    const ownerB = await registerUser("owner-b");
    ownerBToken = ownerB.token;

    const admin = await registerUser("admin");
    await userModel.setRole(admin.id, "ADMIN");
    const relogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: admin.email, password: "Correcthorsebattery1!" });
    adminToken = relogin.body.accessToken;
  });

  afterAll(async () => {
    await pool.end();
  });

  it("rejects an unauthenticated request", async () => {
    if (skip) return;
    const res = await request(app).get("/api/v1/resources");
    expect(res.status).toBe(401);
  });

  it("runs the full upload-intent -> upload -> confirm -> ready flow", async () => {
    if (skip) return;
    const { intentRes, uploadRes, confirmRes } =
      await uploadAndConfirm(ownerAToken);

    expect(intentRes.status).toBe(201);
    expect(intentRes.body.data.resource.status).toBe("PENDING");

    expect(uploadRes.status).toBe(200);

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.resource.status).toBe("READY");
    expect(confirmRes.body.data.file.status).toBe("READY");
  });

  it("rejects a file whose content does not match any allowed type", async () => {
    if (skip) return;
    const intentRes = await createUploadIntent(ownerAToken, {
      sizeBytes: NOT_A_REAL_FILE_BUFFER.length,
    });
    const uploadRes = await request(app)
      .put(intentRes.body.data.uploadUrl)
      .set("Authorization", `Bearer ${ownerAToken}`)
      .attach("file", NOT_A_REAL_FILE_BUFFER, "notes.pdf");

    expect(uploadRes.status).toBe(400);
  });

  it("rejects a file whose real content type does not match the declared type", async () => {
    if (skip) return;
    // Declares PDF but the bytes are actually a PNG — magic-byte check
    // must catch this even though the declared Content-Type "lied".
    const intentRes = await createUploadIntent(ownerAToken, {
      sizeBytes: PNG_BUFFER.length,
    });
    const uploadRes = await request(app)
      .put(intentRes.body.data.uploadUrl)
      .set("Authorization", `Bearer ${ownerAToken}`)
      .attach("file", PNG_BUFFER, "notes.pdf");

    expect(uploadRes.status).toBe(400);
  });

  it("rejects an oversized declared file size at upload-intent time", async () => {
    if (skip) return;
    const res = await createUploadIntent(ownerAToken, {
      sizeBytes: 999_999_999_999,
    });
    expect(res.status).toBe(400);
  });

  it("rejects replaying an already-consumed upload token", async () => {
    if (skip) return;
    const { uploadUrl } = await uploadAndConfirm(ownerAToken);
    const replayRes = await request(app)
      .put(uploadUrl)
      .set("Authorization", `Bearer ${ownerAToken}`)
      .attach("file", PDF_BUFFER, "notes.pdf");
    expect(replayRes.status).toBe(409);
  });

  it("rejects an upload token used against the download route (wrong purpose)", async () => {
    if (skip) return;
    const intentRes = await createUploadIntent(ownerAToken);
    const uploadToken = new URL(
      intentRes.body.data.uploadUrl,
      "http://localhost",
    ).searchParams.get("token");
    const res = await request(app).get(
      `/api/v1/resources/files/download?token=${uploadToken}`,
    );
    expect(res.status).toBe(401);
  });

  it("rejects an invalid/garbage token on both storage routes", async () => {
    if (skip) return;
    const uploadRes = await request(app)
      .put("/api/v1/resources/files/upload?token=not-a-real-token")
      .set("Authorization", `Bearer ${ownerAToken}`)
      .attach("file", PDF_BUFFER, "notes.pdf");
    expect(uploadRes.status).toBe(401);

    const downloadRes = await request(app).get(
      "/api/v1/resources/files/download?token=not-a-real-token",
    );
    expect(downloadRes.status).toBe(401);
  });

  it("hides a stranger's non-READY resource (404) but shows it once READY", async () => {
    if (skip) return;
    const intentRes = await createUploadIntent(ownerAToken);
    const resourceId = intentRes.body.data.resource.id;

    const hiddenRes = await request(app)
      .get(`/api/v1/resources/${resourceId}`)
      .set("Authorization", `Bearer ${ownerBToken}`);
    expect(hiddenRes.status).toBe(404);

    const { resourceId: readyResourceId } = await uploadAndConfirm(ownerAToken);
    const visibleRes = await request(app)
      .get(`/api/v1/resources/${readyResourceId}`)
      .set("Authorization", `Bearer ${ownerBToken}`);
    expect(visibleRes.status).toBe(200);
  });

  it("lets a stranger view but not mutate a READY resource (403), while the owner can", async () => {
    if (skip) return;
    const { resourceId } = await uploadAndConfirm(ownerAToken);

    const strangerEditRes = await request(app)
      .put(`/api/v1/resources/${resourceId}`)
      .set("Authorization", `Bearer ${ownerBToken}`)
      .send({ title: "Hijacked title" });
    expect(strangerEditRes.status).toBe(403);

    const ownerEditRes = await request(app)
      .put(`/api/v1/resources/${resourceId}`)
      .set("Authorization", `Bearer ${ownerAToken}`)
      .send({ title: "Updated by owner" });
    expect(ownerEditRes.status).toBe(200);
  });

  it("rejects a stranger's delete but lets the owner permanently delete their resource", async () => {
    if (skip) return;
    const { resourceId } = await uploadAndConfirm(ownerAToken);

    const strangerDeleteRes = await request(app)
      .delete(`/api/v1/resources/${resourceId}`)
      .set("Authorization", `Bearer ${ownerBToken}`);
    expect(strangerDeleteRes.status).toBe(403);

    const ownerDeleteRes = await request(app)
      .delete(`/api/v1/resources/${resourceId}`)
      .set("Authorization", `Bearer ${ownerAToken}`);
    expect(ownerDeleteRes.status).toBe(200);

    // Gone for good, not just archived — even the owner gets 404 now.
    const afterDeleteRes = await request(app)
      .get(`/api/v1/resources/${resourceId}`)
      .set("Authorization", `Bearer ${ownerAToken}`);
    expect(afterDeleteRes.status).toBe(404);
  });

  it("lets an ADMIN permanently delete another user's resource", async () => {
    if (skip) return;
    const { resourceId } = await uploadAndConfirm(ownerAToken);

    const adminDeleteRes = await request(app)
      .delete(`/api/v1/resources/${resourceId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminDeleteRes.status).toBe(200);
  });

  it("treats ?mine=false the same as omitting it, not the same as ?mine=true", async () => {
    if (skip) return;
    // Regression test: z.coerce.boolean() would have coerced the
    // STRING "false" to true (any non-empty string is JS-truthy),
    // silently making ?mine=false behave like ?mine=true.
    await uploadAndConfirm(ownerAToken);

    const mineFalseRes = await request(app)
      .get("/api/v1/resources?mine=false")
      .set("Authorization", `Bearer ${ownerBToken}`);
    const mineTrueRes = await request(app)
      .get("/api/v1/resources?mine=true")
      .set("Authorization", `Bearer ${ownerBToken}`);

    // ownerB has uploaded nothing, but ownerA's resource above is READY
    // and public, so ?mine=false must show it while ?mine=true must not.
    expect(mineFalseRes.body.meta.total).toBeGreaterThan(0);
    expect(mineTrueRes.body.meta.total).toBe(0);
  });

  it("lets an ADMIN archive another user's resource", async () => {
    if (skip) return;
    const { resourceId } = await uploadAndConfirm(ownerAToken);

    const adminArchiveRes = await request(app)
      .patch(`/api/v1/resources/${resourceId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ action: "ARCHIVE" });
    expect(adminArchiveRes.status).toBe(200);
    expect(adminArchiveRes.body.data.status).toBe("ARCHIVED");
  });

  it("issues a download-url only when visible, and the link streams the file back", async () => {
    if (skip) return;
    const { fileId } = await uploadAndConfirm(ownerAToken);

    const urlRes = await request(app)
      .get(`/api/v1/resources/files/${fileId}/download-url`)
      .set("Authorization", `Bearer ${ownerBToken}`);
    expect(urlRes.status).toBe(200);

    const downloadRes = await request(app).get(urlRes.body.data.url);
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.body.toString()).toContain("fake pdf content for tests");
  });

  it("finds resources by keyword search across title and description, ranking title matches first", async () => {
    if (skip) return;
    const unique = Date.now();
    await uploadAndConfirm(ownerAToken, PDF_BUFFER, {
      title: `Quantum Mechanics Notes ${unique}`,
    });
    await uploadAndConfirm(ownerAToken, PDF_BUFFER, {
      title: `Unrelated Resource ${unique}`,
      description: `Some notes that mention quantum mechanics in passing, ${unique}`,
    });

    const res = await request(app)
      .get("/api/v1/resources")
      .set("Authorization", `Bearer ${ownerBToken}`)
      .query({ q: `quantum mechanics ${unique}` });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].title).toContain("Quantum Mechanics Notes");
  });

  it("orders by relevance rank ahead of the explicit sortBy, using it only as a tiebreaker", async () => {
    if (skip) return;
    const unique = Date.now();
    // Both query terms hit in the title (weight A+A) -> higher rank.
    await uploadAndConfirm(ownerAToken, PDF_BUFFER, {
      title: `Zeta Quantum Notes ${unique}`,
    });
    // "unique" hits the title but "quantum" only hits the description
    // (weight A+B) -> lower rank than the resource above.
    await uploadAndConfirm(ownerAToken, PDF_BUFFER, {
      title: `Aardvark Resource ${unique}`,
      description: `Some notes that mention quantum here, ${unique}`,
    });

    // Alphabetically "Aardvark..." sorts before "Zeta...", so if sortBy
    // were applied ahead of rank, that title order is what we'd see.
    // Asserting the opposite order proves rank wins, with sortBy only
    // breaking ties within equal rank.
    const res = await request(app)
      .get("/api/v1/resources")
      .set("Authorization", `Bearer ${ownerBToken}`)
      .query({ q: `quantum ${unique}`, sortBy: "title" });

    expect(res.status).toBe(200);
    const titles = res.body.data.map((r: { title: string }) => r.title);
    expect(titles).toEqual([
      `Zeta Quantum Notes ${unique}`,
      `Aardvark Resource ${unique}`,
    ]);
  });

  it("rejects an unknown sortBy value", async () => {
    if (skip) return;
    const res = await request(app)
      .get("/api/v1/resources")
      .set("Authorization", `Bearer ${ownerBToken}`)
      .query({ sortBy: "popularity" });
    expect(res.status).toBe(400);
  });

  it("rejects a request body with an unknown field", async () => {
    if (skip) return;
    const res = await request(app)
      .post("/api/v1/resources/upload-intent")
      .set("Authorization", `Bearer ${ownerAToken}`)
      .send({
        title: "Sneaky",
        fileName: "notes.pdf",
        contentType: "application/pdf",
        sizeBytes: 10,
        ownerId: "should-not-be-settable",
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
