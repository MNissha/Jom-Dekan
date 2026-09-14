import request from "supertest";
import { createApp } from "../../src/app";
import { pool } from "../../src/config/config/db";
import { userModel } from "../../src/models/userModel";
import {
  seededTaxonomy,
  baseRegisterPayload,
} from "../helpers/registerPayload";

const app = createApp();

async function dbReachable(): Promise<boolean> {
  try {
    await pool.query("SELECT 1 FROM users LIMIT 1");
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
  const email = `admin-user-actions-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send(baseRegisterPayload(taxonomy, { email, displayName: label }));
  if (!res.body.accessToken) {
    throw new Error(
      `registerUser("${label}") failed: ${JSON.stringify(res.body)}`,
    );
  }
  return { email, id: res.body.user.id as string };
}

async function login(email: string) {
  return request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: "Correcthorsebattery1!" });
}

describe("Admin user management (disable/enable/delete)", () => {
  let skip = false;
  let adminToken = "";
  let adminId = "";

  beforeAll(async () => {
    skip = !(await dbReachable());
    if (skip) return;

    const admin = await registerUser("admin");
    await userModel.setRole(admin.id, "ADMIN");
    adminId = admin.id;
    const adminLogin = await login(admin.email);
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    await pool.end();
  });

  it("rejects a non-admin from listing or acting on users", async () => {
    if (skip) return;
    const target = await registerUser("victim-authz");
    const targetLogin = await login(target.email);

    const listRes = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${targetLogin.body.accessToken}`);
    expect(listRes.status).toBe(403);

    const disableRes = await request(app)
      .post(`/api/v1/admin/users/${adminId}/disable`)
      .set("Authorization", `Bearer ${targetLogin.body.accessToken}`)
      .send({ reason: "not an admin" });
    expect(disableRes.status).toBe(403);
  });

  it("refuses to let an admin disable or delete their own account", async () => {
    if (skip) return;
    const disableRes = await request(app)
      .post(`/api/v1/admin/users/${adminId}/disable`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "testing self-protection" });
    expect(disableRes.status).toBe(400);

    const deleteRes = await request(app)
      .delete(`/api/v1/admin/users/${adminId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "testing self-protection" });
    expect(deleteRes.status).toBe(400);
  });

  it("requires a reason of at least 5 characters to disable or delete", async () => {
    if (skip) return;
    const target = await registerUser("victim-reason");

    const disableRes = await request(app)
      .post(`/api/v1/admin/users/${target.id}/disable`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "bad" });
    expect(disableRes.status).toBe(400);

    const deleteRes = await request(app)
      .delete(`/api/v1/admin/users/${target.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "bad" });
    expect(deleteRes.status).toBe(400);
  });

  it("disables an account indefinitely, blocking login, then re-enables it", async () => {
    if (skip) return;
    const target = await registerUser("victim-disable");

    const preLogin = await login(target.email);
    expect(preLogin.status).toBe(200);

    const disableRes = await request(app)
      .post(`/api/v1/admin/users/${target.id}/disable`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "violated community guidelines" });
    expect(disableRes.status).toBe(200);
    expect(disableRes.body.data.status).toBe("SUSPENDED");
    expect(disableRes.body.data.suspendedUntil).toBeNull();

    const blockedLogin = await login(target.email);
    expect(blockedLogin.status).toBe(403);

    const listRes = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ search: target.email });
    expect(listRes.body.data[0].status).toBe("SUSPENDED");

    const enableRes = await request(app)
      .post(`/api/v1/admin/users/${target.id}/enable`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(enableRes.status).toBe(200);
    expect(enableRes.body.data.status).toBe("ACTIVE");

    const restoredLogin = await login(target.email);
    expect(restoredLogin.status).toBe(200);
  });

  it("auto-reactivates a timed disable once the timer has passed, on the next login attempt", async () => {
    if (skip) return;
    const target = await registerUser("victim-timer");
    const until = new Date(Date.now() + 1500).toISOString();

    const disableRes = await request(app)
      .post(`/api/v1/admin/users/${target.id}/disable`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ until, reason: "temporary cooldown" });
    expect(disableRes.status).toBe(200);
    expect(disableRes.body.data.suspendedUntil).not.toBeNull();

    const blockedLogin = await login(target.email);
    expect(blockedLogin.status).toBe(403);

    await new Promise((resolve) => setTimeout(resolve, 1700));

    const restoredLogin = await login(target.email);
    expect(restoredLogin.status).toBe(200);
  });

  it("rejects a disable-until time that isn't in the future", async () => {
    if (skip) return;
    const target = await registerUser("victim-past-timer");
    const past = new Date(Date.now() - 60_000).toISOString();

    const res = await request(app)
      .post(`/api/v1/admin/users/${target.id}/disable`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ until: past, reason: "should be rejected" });
    expect(res.status).toBe(400);
  });

  it("soft-deletes an account: blocks login and drops it from the user list, without a hard delete", async () => {
    if (skip) return;
    const target = await registerUser("victim-delete");

    const deleteRes = await request(app)
      .delete(`/api/v1/admin/users/${target.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "spam account" });
    expect(deleteRes.status).toBe(200);

    const blockedLogin = await login(target.email);
    expect(blockedLogin.status).toBe(401);

    const listRes = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ search: target.email });
    expect(listRes.body.data).toHaveLength(0);

    const row = await pool.query(
      "SELECT deleted_at, status FROM users WHERE id = $1",
      [target.id],
    );
    expect(row.rows[0].deleted_at).not.toBeNull();
    expect(row.rows[0].status).toBe("DEACTIVATED");
  });
});
