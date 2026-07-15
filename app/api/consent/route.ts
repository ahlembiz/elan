import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { auditEvents, consents } from "../../../db/schema";

const PATIENT_ID = "patient-salah";
const allowedTypes = new Set(["voice_recording", "video_recording", "model_improvement"]);

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { consentType?: string; granted?: boolean };
    const consentType = String(payload.consentType ?? "");
    if (!allowedTypes.has(consentType) || typeof payload.granted !== "boolean") {
      return Response.json({ error: "A valid consent choice is required" }, { status: 400 });
    }
    const user = await getChatGPTUser();
    const actorEmail = user?.email ?? "salah@elan.local";
    const id = `${PATIENT_ID}:${consentType}`;
    const db = getDb();
    await db.insert(consents).values({ id, patientId: PATIENT_ID, consentType: consentType as "voice_recording" | "video_recording" | "model_improvement", granted: payload.granted, actorEmail, updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: consents.id, set: { granted: payload.granted, actorEmail, updatedAt: new Date().toISOString() } });
    await db.insert(auditEvents).values({ patientId: PATIENT_ID, actorEmail, action: payload.granted ? "consent_granted" : "consent_withdrawn", resourceType: "consent", resourceId: id, detail: consentType });
    const [consent] = await db.select().from(consents).where(eq(consents.id, id)).limit(1);
    return Response.json({ consent });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update consent" }, { status: 500 });
  }
}
