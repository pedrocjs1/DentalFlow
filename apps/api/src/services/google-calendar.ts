import { google } from "googleapis";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ENCRYPTION_KEY = Buffer.from(
  process.env.ENCRYPTION_KEY ?? "6465766b65793132333435363738393031323334353637383930313233343536",
  "hex"
);

export function encryptToken(token: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptToken(encrypted: string): string {
  const [ivHex, tagHex, dataHex] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3001/api/v1/google-calendar/callback"
  );
}

export function getAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar"],
    prompt: "consent",
    state,
  });
}

export async function exchangeCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return {
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token!,
    expiresAt: new Date(tokens.expiry_date!),
  };
}

export async function refreshAccessToken(encryptedRefreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const oauth2Client = getOAuth2Client();
  const refreshToken = decryptToken(encryptedRefreshToken);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return {
    accessToken: credentials.access_token!,
    expiresAt: new Date(credentials.expiry_date!),
  };
}

export function getCalendarClient(accessToken: string, refreshToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: decryptToken(accessToken),
    refresh_token: decryptToken(refreshToken),
  });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function createCalendarEvent(params: {
  accessToken: string;
  refreshToken: string;
  calendarId: string;
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
}): Promise<string | null> {
  try {
    const calendar = getCalendarClient(params.accessToken, params.refreshToken);
    const event = await calendar.events.insert({
      calendarId: params.calendarId,
      requestBody: {
        summary: params.summary,
        description: params.description,
        start: { dateTime: params.startTime.toISOString(), timeZone: params.timezone },
        end: { dateTime: params.endTime.toISOString(), timeZone: params.timezone },
      },
    });
    return event.data.id ?? null;
  } catch {
    return null;
  }
}

export async function deleteCalendarEvent(params: {
  accessToken: string;
  refreshToken: string;
  calendarId: string;
  eventId: string;
}): Promise<void> {
  try {
    const calendar = getCalendarClient(params.accessToken, params.refreshToken);
    await calendar.events.delete({ calendarId: params.calendarId, eventId: params.eventId });
  } catch {}
}

export async function getBlockedSlots(params: {
  accessToken: string;
  refreshToken: string;
  calendarId: string;
  timeMin: Date;
  timeMax: Date;
}): Promise<Array<{ start: Date; end: Date; summary: string; type: "event" }>> {
  try {
    const calendar = getCalendarClient(params.accessToken, params.refreshToken);
    const res = await calendar.events.list({
      calendarId: params.calendarId,
      timeMin: params.timeMin.toISOString(),
      timeMax: params.timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 100,
    });
    // Only timed events (start.dateTime) block the schedule.
    // All-day events and Google Tasks (no dateTime) are excluded.
    return (res.data.items ?? [])
      .filter((e) => e.start?.dateTime && e.end?.dateTime)
      .map((e) => ({
        start: new Date(e.start!.dateTime!),
        end: new Date(e.end!.dateTime!),
        summary: e.summary ?? "Bloqueado",
        type: "event" as const,
      }));
  } catch {
    return [];
  }
}

export const isGoogleCalendarConfigured = () =>
  !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
