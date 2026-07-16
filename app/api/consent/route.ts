import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { convexMutation, hasConvex } from "../../../lib/convex";
import { requireApiSession } from "../../../lib/session";
import { auditEvents, consents } from "../../../db/schema";
import { ensureProductWorkspace } from "../product/route";

const PATIENT_ID = "patient-salah";
const allowedTypes = new Set(["voice_recording", "video_recording", "model_improvement"]);

export async function POST(request: Request) {
  try {
    const auth = await requireApiSession(request, ["patient"]);
    if ("response" in auth) return auth.response;
    const payload = await request.json() as { consentType?: string; granted?: boolean };
    const consentType = String(payload.consentType ?? "");
    if (!allowedTypes.has(consentType) || typeof payload.granted !== "boolean") {
      return Response.json({ error: "A valid consent choice is required" }, { status: 400 });
    }
    const actorEmail = auth.session.email;
    const id = `${PATIENT_ID}:${consentType}`;
    if (hasConvex()) {
      const consent = await convexMutation<unknown>("elan:setConsent", {
        patientId: PATIENT_ID,
        consentType,
        granted: payload.granted,
        actorEmail,
      });
      return Response.json({ consent });
    }
    if (!process.env.TURSO_DATABASE_URL) {
      return Response.json({
        consent: {
          id, patientId: PATIENT_ID, consentType, granted: payload.granted,
          version: "frontend-only", actorEmail, updatedAt: new Date().toISOString(),
        },
      });
    }
    await ensureProductWorkspace();
    const db = getDb();
    await db.insert(consents).values({ id, patientId: PATIENT_ID, consentType: consentType as "voice_recording" | "video_recording" | "model_improvement", granted: payload.granted, actorEmail, updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: consents.id, set: { granted: payload.granted, actorEmail, updatedAt: new Date().toISOString() } });
    await db.insert(auditEvents).values({ patientId: PATIENT_ID, actorEmail, action: payload.granted ? "consent_granted" : "consent_withdrawn", resourceType: "consent", resourceId: id, detail: consentType });
    const [consent] = await db.select().from(consents).where(eq(consents.id, id)).limit(1);
    return Response.json({ consent });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update consent" }, { status: 500 });
  }
}
