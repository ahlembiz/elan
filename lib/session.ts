import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export type ActorRole = "patient" | "family" | "admin";

export type ElanSession = {
  role: ActorRole;
  name: string;
  email: string;
  expiresAt: number;
};

const COOKIE_NAME = "elan_session";
const SESSION_DURATION_SECONDS = 12 * 60 * 60;

const identities: Record<ActorRole, { name: string; email: string }> = {
  patient: {
    name: process.env.ELAN_PATIENT_NAME || "Salah",
    email: process.env.ELAN_PATIENT_EMAIL || "salah@elan.local",
  },
  family: {
    name: process.env.ELAN_FAMILY_NAME || "Sylvie",
    email: process.env.ELAN_FAMILY_EMAIL || "sylvie@elan.local",
  },
  admin: {
    name: process.env.ELAN_ADMIN_NAME || "Équipe Élan",
    email: process.env.ELAN_ADMIN_EMAIL || "admin@elan.local",
  },
};

function sessionSecret() {
  const configured = process.env.ELAN_SESSION_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ELAN_SESSION_SECRET is required in production.");
  }
  return "elan-local-development-secret-change-me";
}

function signature(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function encodeSession(session: ElanSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

function decodeSession(value: string | undefined): ElanSession | null {
  if (!value) return null;
  const [payload, suppliedSignature] = value.split(".");
  if (!payload || !suppliedSignature || !constantTimeEqual(signature(payload), suppliedSignature)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ElanSession;
    if (!(["patient", "family", "admin"] as string[]).includes(session.role)) return null;
    if (!session.name || !session.email || session.expiresAt <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function identityForRole(role: ActorRole) {
  return identities[role];
}

export async function getSession() {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(COOKIE_NAME)?.value);
}

export function verifyAccessCode(role: ActorRole, suppliedCode: string) {
  const environmentKey = `ELAN_${role.toUpperCase()}_CODE`;
  const localDefaults: Record<ActorRole, string> = {
    patient: "11111111",
    family: "22222222",
    admin: "33333333",
  };
  const expected = process.env[environmentKey] ||
    (process.env.NODE_ENV === "production" ? "" : localDefaults[role]);
  return Boolean(expected) && constantTimeEqual(suppliedCode, expected);
}

export async function createSession(role: ActorRole) {
  const identity = identityForRole(role);
  const session: ElanSession = {
    role,
    ...identity,
    expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000,
  };
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encodeSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
  return session;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

function requestHasValidOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function requireApiSession(request: Request, allowedRoles: ActorRole[]) {
  if (request.method !== "GET" && request.method !== "HEAD" && !requestHasValidOrigin(request)) {
    return { response: Response.json({ error: "Invalid request origin" }, { status: 403 }) } as const;
  }
  const session = await getSession();
  if (!session) {
    return { response: Response.json({ error: "Authentication required" }, { status: 401 }) } as const;
  }
  if (!allowedRoles.includes(session.role)) {
    return { response: Response.json({ error: "This account cannot perform that action" }, { status: 403 }) } as const;
  }
  return { session } as const;
}
