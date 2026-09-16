import { env } from "../config/config/env";
import { logger } from "../utils/logger";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

function assertConfigured(): void {
  if (!env.google.clientId || !env.google.clientSecret || !env.google.calendarRedirectUri) {
    throw new Error(
      "Google Calendar integration is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_CALENDAR_REDIRECT_URI).",
    );
  }
}

/**
 * Thin REST wrapper around Google's OAuth2 + Calendar v3 APIs, in the
 * same spirit as emailService's own Resend/SendGrid calls — plain
 * `fetch`, no `googleapis` SDK dependency.
 */
export const googleCalendarService = {
  isConfigured(): boolean {
    return Boolean(env.google.clientId && env.google.clientSecret && env.google.calendarRedirectUri);
  },

  getAuthUrl(state: string): string {
    assertConfigured();
    const params = new URLSearchParams({
      client_id: env.google.clientId,
      redirect_uri: env.google.calendarRedirectUri,
      response_type: "code",
      scope: CALENDAR_SCOPE,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    assertConfigured();
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.google.clientId,
        client_secret: env.google.clientSecret,
        redirect_uri: env.google.calendarRedirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Google token exchange failed ${response.status}: ${body}`);
    }
    return (await response.json()) as TokenResponse;
  },

  async refreshAccessToken(refreshToken: string): Promise<string> {
    assertConfigured();
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: env.google.clientId,
        client_secret: env.google.clientSecret,
        grant_type: "refresh_token",
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Google access token refresh failed ${response.status}: ${body}`);
    }
    const data = (await response.json()) as TokenResponse;
    return data.access_token;
  },

  /**
   * Creates an event on the tutor's primary calendar with both parties
   * as attendees (`sendUpdates=all` mails each of them an invite).
   * Returns the created event's id, to store on the booking row.
   */
  async createEvent(params: {
    refreshToken: string;
    tutorEmail: string;
    studentEmail: string;
    summary: string;
    description: string;
    startAt: Date;
    durationMinutes: number;
  }): Promise<string> {
    const accessToken = await googleCalendarService.refreshAccessToken(params.refreshToken);
    const endAt = new Date(params.startAt.getTime() + params.durationMinutes * 60_000);

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: params.summary,
          description: params.description,
          start: { dateTime: params.startAt.toISOString() },
          end: { dateTime: endAt.toISOString() },
          attendees: [{ email: params.tutorEmail }, { email: params.studentEmail }],
          // Both a popup and an email reminder 1 hour before the session,
          // for tutor and student alike — overrides the calendar's own
          // default reminders rather than adding to them.
          reminders: {
            useDefault: false,
            overrides: [
              { method: "popup", minutes: 60 },
              { method: "email", minutes: 60 },
            ],
          },
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Google Calendar event creation failed ${response.status}: ${body}`);
    }
    const event = (await response.json()) as { id: string };
    return event.id;
  },

  /** Cancels a previously-created event (e.g. a booking that got rescheduled or declined after being accepted). */
  async deleteEvent(refreshToken: string, eventId: string): Promise<void> {
    const accessToken = await googleCalendarService.refreshAccessToken(refreshToken);
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all`,
      { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
    );
    // 410 Gone means it's already deleted (e.g. the attendee removed it
    // themselves) — treat that the same as success.
    if (!response.ok && response.status !== 410 && response.status !== 404) {
      const body = await response.text().catch(() => "");
      throw new Error(`Google Calendar event deletion failed ${response.status}: ${body}`);
    }
  },

  /** Best-effort: never let a failed cancellation block the reschedule/decline itself. */
  async deleteEventIfConnected(params: {
    refreshTokenEncrypted: string | null;
    decrypt: (ciphertext: string) => string;
    eventId: string | null;
  }): Promise<void> {
    if (!params.refreshTokenEncrypted || !params.eventId) return;
    try {
      const refreshToken = params.decrypt(params.refreshTokenEncrypted);
      await googleCalendarService.deleteEvent(refreshToken, params.eventId);
    } catch (err) {
      logger.error({ err }, "Failed to delete Google Calendar event for rescheduled/declined booking");
    }
  },

  /**
   * Best-effort: booking acceptance must never fail because Calendar
   * did — same convention as the existing best-effort email calls.
   */
  async createEventIfConnected(params: {
    refreshTokenEncrypted: string | null;
    decrypt: (ciphertext: string) => string;
    tutorEmail: string;
    studentEmail: string;
    summary: string;
    description: string;
    startAt: Date;
    durationMinutes: number;
  }): Promise<string | null> {
    if (!params.refreshTokenEncrypted) return null;
    try {
      const refreshToken = params.decrypt(params.refreshTokenEncrypted);
      return await googleCalendarService.createEvent({
        refreshToken,
        tutorEmail: params.tutorEmail,
        studentEmail: params.studentEmail,
        summary: params.summary,
        description: params.description,
        startAt: params.startAt,
        durationMinutes: params.durationMinutes,
      });
    } catch (err) {
      logger.error({ err }, "Failed to create Google Calendar event for confirmed booking");
      return null;
    }
  },
};
