import request from "supertest";
import { createApp } from "../../src/app";
import { pool } from "../../src/config/config/db";
import { seededTaxonomy, baseRegisterPayload } from "../helpers/registerPayload";

const app = createApp();

async function dbReachable(): Promise<boolean> {
  try {
    await pool.query("SELECT 1 FROM opportunities LIMIT 1");
    return true;
  } catch {
    return false;
  }
}

async function registerUser(label: string) {
  const taxonomy = await seededTaxonomy();
  if (!taxonomy) {
    throw new Error("Run `npm run seed` against the test database before running this suite.");
  }
  const email = `opportunities-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send(baseRegisterPayload(taxonomy, { email, displayName: label }));
  if (!res.body.accessToken) {
    throw new Error(`registerUser("${label}") failed: ${JSON.stringify(res.body)}`);
  }
  return { email, token: res.body.accessToken as string, id: res.body.user.id as string };
}

async function createListing(token: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post("/api/v1/opportunities")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Poster design for campus event",
      description: "We need a poster designed for our upcoming campus event, budget and timeline flexible.",
      listingType: "PROJECT_MENTORSHIP",
      mode: "ONLINE",
      ...overrides,
    });
  if (res.status !== 201) {
    throw new Error(`createListing failed: ${JSON.stringify(res.body)}`);
  }
  return res.body.data.id as string;
}

describe("Opportunities applications API", () => {
  let skip = false;
  let posterToken = "";
  let applicantToken = "";

  beforeAll(async () => {
    skip = !(await dbReachable());
    if (skip) return;

    const poster = await registerUser("poster");
    posterToken = poster.token;

    const applicant = await registerUser("applicant");
    applicantToken = applicant.token;
  });

  afterAll(async () => {
    await pool.end();
  });

  it("rejects applying to your own listing", async () => {
    if (skip) return;
    const listingId = await createListing(posterToken);

    const res = await request(app)
      .post(`/api/v1/opportunities/${listingId}/applications`)
      .set("Authorization", `Bearer ${posterToken}`)
      .field("coverMessage", "I would like to apply to my own listing.");

    expect(res.status).toBe(400);
  });

  it("lets a student apply, notifies the poster, and lets the poster accept it", async () => {
    if (skip) return;
    const listingId = await createListing(posterToken);

    const applyRes = await request(app)
      .post(`/api/v1/opportunities/${listingId}/applications`)
      .set("Authorization", `Bearer ${applicantToken}`)
      .field("coverMessage", "I have designed posters for three prior campus events.")
      .attach("cv", Buffer.from("%PDF-1.4 fake cv"), "cv.pdf");

    expect(applyRes.status).toBe(201);
    const applicationId = applyRes.body.data.id as string;

    // Poster was notified.
    const notifRes = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${posterToken}`);
    expect(notifRes.status).toBe(200);
    expect(
      notifRes.body.data.some((n: { type: string }) => n.type === "OPPORTUNITY_APPLICATION_RECEIVED"),
    ).toBe(true);

    // Poster can see the application with the CV flagged as attached.
    const listRes = await request(app)
      .get(`/api/v1/opportunities/${listingId}/applications`)
      .set("Authorization", `Bearer ${posterToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].has_cv).toBe(true);

    // A stranger (the applicant themself) cannot list another owner's applications.
    const forbiddenList = await request(app)
      .get(`/api/v1/opportunities/${listingId}/applications`)
      .set("Authorization", `Bearer ${applicantToken}`);
    expect(forbiddenList.status).toBe(403);

    // The applicant can download their own CV back.
    const downloadRes = await request(app)
      .get(`/api/v1/opportunities/applications/${applicationId}/files/cv`)
      .set("Authorization", `Bearer ${applicantToken}`);
    expect(downloadRes.status).toBe(200);

    // Accept the application.
    const decideRes = await request(app)
      .patch(`/api/v1/opportunities/applications/${applicationId}/status`)
      .set("Authorization", `Bearer ${posterToken}`)
      .send({ status: "accepted" });
    expect(decideRes.status).toBe(200);
    expect(decideRes.body.data.status).toBe("accepted");

    // Deciding again is rejected — decisions are terminal.
    const redecideRes = await request(app)
      .patch(`/api/v1/opportunities/applications/${applicationId}/status`)
      .set("Authorization", `Bearer ${posterToken}`)
      .send({ status: "declined" });
    expect(redecideRes.status).toBe(400);

    // The applicant was notified of the decision.
    const applicantNotifRes = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${applicantToken}`);
    expect(
      applicantNotifRes.body.data.some((n: { type: string }) => n.type === "OPPORTUNITY_APPLICATION_ACCEPTED"),
    ).toBe(true);
  });

  it("prevents a non-owner from deciding an application", async () => {
    if (skip) return;
    const listingId = await createListing(posterToken);
    const applyRes = await request(app)
      .post(`/api/v1/opportunities/${listingId}/applications`)
      .set("Authorization", `Bearer ${applicantToken}`)
      .field("coverMessage", "Another genuine application to this listing.");
    const applicationId = applyRes.body.data.id as string;

    const outsider = await registerUser("outsider");
    const res = await request(app)
      .patch(`/api/v1/opportunities/applications/${applicationId}/status`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({ status: "accepted" });
    expect(res.status).toBe(403);
  });

  it("auto-archives a listing once its application deadline has passed", async () => {
    if (skip) return;
    const listingId = await createListing(posterToken, {
      title: "Expired freelance gig",
      applicationDeadline: "2000-01-01",
    });

    const res = await request(app).get("/api/v1/opportunities");
    expect(res.status).toBe(200);
    expect(res.body.data.some((o: { id: string }) => o.id === listingId)).toBe(false);

    const mineRes = await request(app)
      .get("/api/v1/opportunities/mine")
      .set("Authorization", `Bearer ${posterToken}`);
    const archived = mineRes.body.data.find((o: { id: string }) => o.id === listingId);
    expect(archived?.status).toBe("closed");
  });

  it("rejects a second application from the same applicant", async () => {
    if (skip) return;
    const listingId = await createListing(posterToken);
    await request(app)
      .post(`/api/v1/opportunities/${listingId}/applications`)
      .set("Authorization", `Bearer ${applicantToken}`)
      .field("coverMessage", "First application to this listing, should succeed fine.");

    const second = await request(app)
      .post(`/api/v1/opportunities/${listingId}/applications`)
      .set("Authorization", `Bearer ${applicantToken}`)
      .field("coverMessage", "Second application to the same listing, should be rejected.");
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("DUPLICATE_APPLICATION");
  });

  it("prevents reapplying to a listing once the application was declined", async () => {
    if (skip) return;
    const listingId = await createListing(posterToken);
    const applyRes = await request(app)
      .post(`/api/v1/opportunities/${listingId}/applications`)
      .set("Authorization", `Bearer ${applicantToken}`)
      .field("coverMessage", "Application that will be declined.");
    const applicationId = applyRes.body.data.id as string;

    const decideRes = await request(app)
      .patch(`/api/v1/opportunities/applications/${applicationId}/status`)
      .set("Authorization", `Bearer ${posterToken}`)
      .send({ status: "declined" });
    expect(decideRes.status).toBe(200);
    expect(decideRes.body.data.status).toBe("declined");

    const reapplyRes = await request(app)
      .post(`/api/v1/opportunities/${listingId}/applications`)
      .set("Authorization", `Bearer ${applicantToken}`)
      .field("coverMessage", "Trying to apply again after being declined.");
    expect(reapplyRes.status).toBe(409);
    expect(reapplyRes.body.error.code).toBe("DUPLICATE_APPLICATION");

    // The listing feed reflects the outcome so the frontend can block re-applying up front too.
    const listRes = await request(app)
      .get("/api/v1/opportunities")
      .set("Authorization", `Bearer ${applicantToken}`);
    const listing = listRes.body.data.find((o: { id: string }) => o.id === listingId);
    expect(listing.my_application_status).toBe("declined");
  });
});
