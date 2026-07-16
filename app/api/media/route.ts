import { and, desc, eq, ne } from "drizzle-orm";
import { getDb } from "../../../db";
import { deletePrivateMedia, loadPrivateMedia, storePrivateMedia } from "../../../lib/media-storage";
import { requireApiSession } from "../../../lib/session";
import { auditEvents, consents, mediaAssets } from "../../../db/schema";
import { ensureProductWorkspace } from "../product/route";

export const runtime = "nodejs";

const PATIENT_ID = "patient-salah";
const MAX_RECORDING_SIZE = 15 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = new Set(["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav"]);

export async function GET(request: Request) {
  try {
    const auth = await requireApiSession(request, ["patient", "admin"]);
    if ("response" in auth) return auth.response;
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "Recording id is required" }, { status: 400 });
    await ensureProductWorkspace();
    const db = getDb();
    const [asset] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, id), eq(mediaAssets.patientId, PATIENT_ID), ne(mediaAssets.reviewStatus, "deleted"))).limit(1);
    if (!asset) return Response.json({ error: "Recording not found" }, { status: 404 });
    const bytes = await loadPrivateMedia(asset.storageKey);
    if (!bytes) return Response.json({ error: "Recording bytes are unavailable" }, { status: 404 });
    return new Response(bytes, { headers: { "Content-Type": asset.contentType, "Content-Length": String(asset.sizeBytes), "Cache-Control": "private, no-store", "Content-Disposition": `inline; filename="elan-recording-${asset.id}"` } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load recording" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiSession(request, ["patient"]);
    if ("response" in auth) return auth.response;
    await ensureProductWorkspace();
    const form = await request.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File) || audio.size === 0) return Response.json({ error: "An audio recording is required" }, { status: 400 });
    if (audio.size > MAX_RECORDING_SIZE) return Response.json({ error: "Recording exceeds the 15 MB limit" }, { status: 413 });
    const contentType = audio.type || "audio/webm";
    if (!ALLOWED_AUDIO_TYPES.has(contentType)) return Response.json({ error: "Unsupported audio format" }, { status: 415 });

    const db = getDb();
    const [voiceConsent] = await db.select().from(consents).where(and(eq(consents.patientId, PATIENT_ID), eq(consents.consentType, "voice_recording"), eq(consents.granted, true))).orderBy(desc(consents.updatedAt)).limit(1);
    if (!voiceConsent) return Response.json({ error: "Voice-recording consent is required" }, { status: 403 });

    const id = crypto.randomUUID();
    const pathname = `patients/${PATIENT_ID}/voice/${id}`;
    const storageKey = await storePrivateMedia(pathname, audio);
    try {
      const [asset] = await db.insert(mediaAssets).values({ id, patientId: PATIENT_ID, assignmentId: String(form.get("assignmentId") ?? "assignment-words"), kind: "voice_recording", storageKey, contentType, sizeBytes: audio.size, durationMs: Number(form.get("durationMs") ?? 0) || null, recordedBy: auth.session.email }).returning();
      await db.insert(auditEvents).values({ patientId: PATIENT_ID, actorEmail: auth.session.email, action: "recording_created", resourceType: "media_asset", resourceId: id, detail: `consent:${voiceConsent.version}` });
      return Response.json({ asset: { id: asset.id, kind: asset.kind, contentType: asset.contentType, sizeBytes: asset.sizeBytes, durationMs: asset.durationMs, recordedBy: asset.recordedBy, reviewStatus: asset.reviewStatus, createdAt: asset.createdAt } }, { status: 201 });
    } catch (error) {
      await deletePrivateMedia(storageKey);
      throw error;
    }
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save recording" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireApiSession(request, ["patient", "admin"]);
    if ("response" in auth) return auth.response;
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "Recording id is required" }, { status: 400 });
    await ensureProductWorkspace();
    const db = getDb();
    const [asset] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, id), eq(mediaAssets.patientId, PATIENT_ID))).limit(1);
    if (!asset) return Response.json({ error: "Recording not found" }, { status: 404 });
    await deletePrivateMedia(asset.storageKey);
    await db.update(mediaAssets).set({ reviewStatus: "deleted" }).where(eq(mediaAssets.id, id));
    await db.insert(auditEvents).values({ patientId: PATIENT_ID, actorEmail: auth.session.email, action: "recording_deleted", resourceType: "media_asset", resourceId: id });
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to delete recording" }, { status: 500 });
  }
}
