import request from "supertest";
import { createApp } from "../../src/app";
import { pool } from "../../src/config/config/db";
import {
  seededTaxonomy,
  baseRegisterPayload,
} from "../helpers/registerPayload";

const app = createApp();

const PDF_BUFFER = Buffer.from("%PDF-1.4\nfake pdf content for tests\n%%EOF");

async function dbReachable(): Promise<boolean> {
  try {
    await pool.query("SELECT 1 FROM favorites LIMIT 1");
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
  const email = `favorites-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
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

async function createReadyResource(
  token: string,
  overrides: Partial<Record<string, unknown>> = {},
) {
  const intentRes = await request(app)
    .post("/api/v1/resources/upload-intent")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: `Favorite Test Resource ${Date.now()}`,
      fileName: "notes.pdf",
      contentType: "application/pdf",
      sizeBytes: PDF_BUFFER.length,
      category: "NOTES",
      ...overrides,
    });
  const { uploadUrl } = intentRes.body.data;
  const fileId = intentRes.body.data.file.id;
  const resourceId = intentRes.body.data.resource.id;

  await request(app)
    .put(uploadUrl)
    .set("Authorization", `Bearer ${token}`)
    .attach("file", PDF_BUFFER, "notes.pdf");

  await request(app)
    .post(`/api/v1/resources/files/${fileId}/confirm`)
    .set("Authorization", `Bearer ${token}`);

  return resourceId;
}

describe("Favorites API", () => {
  let skip = false;
  let userToken = "";
  let ownerToken = "";

  beforeAll(async () => {
    skip = !(await dbReachable());
    if (skip) return;

    const user = await registerUser("user");
    userToken = user.token;

    const owner = await registerUser("owner");
    ownerToken = owner.token;
  });

  afterAll(async () => {
    await pool.end();
  });

  it("rejects an unauthenticated request", async () => {
    if (skip) return;
    const res = await request(app).get("/api/v1/favorites");
    expect(res.status).toBe(401);
  });

  it("adds a favorite and reports it as favorited", async () => {
    if (skip) return;
    const resourceId = await createReadyResource(ownerToken);

    const addRes = await request(app)
      .post("/api/v1/favorites")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ targetType: "resource", targetId: resourceId });
    expect(addRes.status).toBe(200);
    expect(addRes.body.data.targetId).toBe(resourceId);

    const statusRes = await request(app)
      .get(`/api/v1/favorites/resource/${resourceId}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.isFavorited).toBe(true);
  });

  it("reports a resource as not favorited before it's added", async () => {
    if (skip) return;
    const resourceId = await createReadyResource(ownerToken);

    const statusRes = await request(app)
      .get(`/api/v1/favorites/resource/${resourceId}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.isFavorited).toBe(false);
  });

  it("treats a repeated (sequential) favorite request as a success, not an error", async () => {
    if (skip) return;
    const resourceId = await createReadyResource(ownerToken);

    const first = await request(app)
      .post("/api/v1/favorites")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ targetType: "resource", targetId: resourceId });
    const second = await request(app)
      .post("/api/v1/favorites")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ targetType: "resource", targetId: resourceId });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.data.targetId).toBe(resourceId);
  });

  it("never creates more than one row when the same favorite is requested concurrently (double-click / replay)", async () => {
    if (skip) return;
    const resourceId = await createReadyResource(ownerToken);

    // Fire both requests at once, not one after another — this is the
    // actual race a double-click or a replayed request would produce.
    const [resA, resB] = await Promise.all([
      request(app)
        .post("/api/v1/favorites")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ targetType: "resource", targetId: resourceId }),
      request(app)
        .post("/api/v1/favorites")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ targetType: "resource", targetId: resourceId }),
    ]);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    const countRes = await pool.query(
      "SELECT COUNT(*) FROM favorites WHERE target_type = 'resource' AND target_id = $1",
      [resourceId],
    );
    // The UNIQUE(user_id, resource_id) constraint from migration 005 is
    // what actually guarantees this — not application-level logic.
    expect(Number(countRes.rows[0].count)).toBe(1);
  });

  it("lists a user's favorited resources", async () => {
    if (skip) return;
    const resourceId = await createReadyResource(ownerToken);
    await request(app)
      .post("/api/v1/favorites")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ targetType: "resource", targetId: resourceId });

    const listRes = await request(app)
      .get("/api/v1/favorites")
      .set("Authorization", `Bearer ${userToken}`);
    expect(listRes.status).toBe(200);
    const resourceIds = listRes.body.data.map(
      (item: { resource: { id: string } }) => item.resource.id,
    );
    expect(resourceIds).toContain(resourceId);
  });

  it("removes a favorite, and removing it again is still a success (idempotent)", async () => {
    if (skip) return;
    const resourceId = await createReadyResource(ownerToken);
    await request(app)
      .post("/api/v1/favorites")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ targetType: "resource", targetId: resourceId });

    const removeRes = await request(app)
      .delete(`/api/v1/favorites/resource/${resourceId}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(removeRes.status).toBe(200);

    const statusRes = await request(app)
      .get(`/api/v1/favorites/resource/${resourceId}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(statusRes.body.data.isFavorited).toBe(false);

    const secondRemoveRes = await request(app)
      .delete(`/api/v1/favorites/resource/${resourceId}`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(secondRemoveRes.status).toBe(200);
  });

  it("hides a stranger's non-READY resource from favoriting (404), consistent with viewing it", async () => {
    if (skip) return;
    const intentRes = await request(app)
      .post("/api/v1/resources/upload-intent")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        title: `Pending Resource ${Date.now()}`,
        fileName: "notes.pdf",
        contentType: "application/pdf",
        sizeBytes: PDF_BUFFER.length,
        category: "NOTES",
      });
    const pendingResourceId = intentRes.body.data.resource.id;

    const addRes = await request(app)
      .post("/api/v1/favorites")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ targetType: "resource", targetId: pendingResourceId });
    expect(addRes.status).toBe(404);
  });

  it("rejects a request body with an unknown field", async () => {
    if (skip) return;
    const resourceId = await createReadyResource(ownerToken);
    const res = await request(app)
      .post("/api/v1/favorites")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        targetType: "resource",
        targetId: resourceId,
        note: "should not be allowed",
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
