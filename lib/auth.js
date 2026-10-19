import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getPool, initializeDatabase } from "./database";

const SESSION_COOKIE = "sessions";
const SESSION_LIFETIME_MS = 60 * 60 * 1000;

function sessionSecret() {
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required in production.");
  }

  return process.env.SESSION_SECRET || "development-only-change-me";
}

function signature(sessionId) {
  return createHmac("sha256", sessionSecret())
    .update(sessionId)
    .digest("base64")
    .replace(/=+$/, "");
}

function cookieValue(sessionId) {
  return `s:${sessionId}.${signature(sessionId)}`;
}

export function sessionCookieHeader(sessionId) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(cookieValue(sessionId))}; Path=/; Max-Age=3600; HttpOnly; SameSite=Lax${secure}`;
}

export function clearSessionCookieHeader() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
}

function sessionIdFromRequest(request) {
  const cookies = request.headers.get("cookie") || "";
  const cookie = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));

  if (!cookie) return null;

  let value;
  try {
    value = decodeURIComponent(cookie.slice(SESSION_COOKIE.length + 1));
  } catch {
    return null;
  }

  const match = /^s:([a-f0-9]{64})\.([A-Za-z0-9+/]+)$/.exec(value);
  if (!match) return null;

  const expected = Buffer.from(signature(match[1]));
  const actual = Buffer.from(match[2]);
  return expected.length === actual.length && timingSafeEqual(expected, actual)
    ? match[1]
    : null;
}

export async function getCurrentUser(request) {
  const sessionId = sessionIdFromRequest(request);
  if (!sessionId) return null;

  await initializeDatabase();
  const [rows] = await getPool().execute(
    `SELECT u.id, u.full_name, u.email, u.mobile, u.username, u.user_type,
            u.last_login, u.created_at, u.updated_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND s.expires_at > UTC_TIMESTAMP(3)
      LIMIT 1`,
    [sessionId],
  );

  return rows[0] ? toPublicUser(rows[0]) : null;
}

export function toPublicUser(row) {
  if (!row) return null;

  return {
    _id: row.id,
    fullName: row.full_name,
    email: row.email,
    mobile: row.mobile,
    username: row.username,
    userType: row.user_type,
    lastLogin: row.last_login,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createSession(userId) {
  await initializeDatabase();
  const sessionId = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

  await getPool().execute(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
    [sessionId, userId, expiresAt],
  );

  return sessionId;
}

export async function destroySession(request) {
  const sessionId = sessionIdFromRequest(request);
  if (!sessionId) return;

  await initializeDatabase();
  await getPool().execute("DELETE FROM sessions WHERE id = ?", [sessionId]);
}

const salesPermissions = new Set([
  "getallcategory",
  "addcategory",
  "editcategory",
  "getallcompany",
  "addcompany",
  "editcompany",
  "addquotation",
  "getallquotation",
  "getallproduct",
]);

export function isAllowed(user, action) {
  if (!user) return false;
  return user.userType === "admin" || salesPermissions.has(action);
}
