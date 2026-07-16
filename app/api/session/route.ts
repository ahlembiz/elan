import { clearSession, createSession, type ActorRole } from "../../../lib/session";

const roles = new Set<ActorRole>(["patient", "family", "admin"]);

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { role?: string };
    const role = String(payload.role ?? "") as ActorRole;
    if (!roles.has(role)) return Response.json({ error: "Espace invalide" }, { status: 400 });
    const session = await createSession(role);
    return Response.json({ role: session.role, name: session.name });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to sign in" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin" }, { status: 403 });
  }
  await clearSession();
  return Response.json({ signedOut: true });
}
