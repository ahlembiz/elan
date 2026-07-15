import { and, desc, eq, ne } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { auditEvents, consents, mediaAssets } from "../../../db/schema";

const PATIENT_ID = "patient-salah";

export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "Recording id is required" }, { status: 400 });
    const db = getDb();
    const [asset] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, id), ne(mediaAssets.reviewStatus, "deleted"))).limit(1);
    if (!asset) return Response.json({ error: "Recording not found" }, { status: 404 });
    const object = await env.MEDIA.get(asset.storageKey);
    if (!object) return Response.json({ error: "Recording bytes are unavailable" }, { status: 404 });
    return new Response(object.body, { headers: { "Content-Type": asset.contentType, "Content-Length": String(asset.sizeBytes), "Cache-Control": "private, no-store", "Content-Disposition": `inline; filename="elan-recording-${asset.id}.webm"` } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load recording" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File) || audio.size === 0) return Response.json({ error: "An audio recording is required" }, { status: 400 });
    if (audio.size > 15 * 1024 * 1024) return Response.json({ error: "Recording exceeds the 15 MB pilot limit" }, { status: 413 });
    const db = getDb();
    const [voiceConsent] = await db.select().from(consents).where(and(eq(consents.patientId, PATIENT_ID), eq(consents.consentType, "voice_recording"), eq(consents.granted, true))).orderBy(desc(consents.updatedAt)).limit(1);
    if (!voiceConsent) return Response.json({ error: "Voice-recording consent is required" }, { status: 403 });
    const user = await getChatGPTUser();
    const actorEmail = user?.email ?? "patient-demo@elan.local";
    const id = crypto.randomUUID();
    const contentType = audio.type || "audio/webm";
    const storageKey = `patients/${PATIENT_ID}/voice/${id}.webm`;
    await env.MEDIA.put(storageKey, audio.stream(), { httpMetadata: { contentType }, customMetadata: { patientId: PATIENT_ID, consentVersion: voiceConsent.version, recordedBy: actorEmail } });
    const [asset] = await db.insert(mediaAssets).values({ id, patientId: PATIENT_ID, assignmentId: String(form.get("assignmentId") ?? "assignment-words"), kind: "voice_recording", storageKey, contentType, sizeBytes: audio.size, durationMs: Number(form.get("durationMs") ?? 0) || null, recordedBy: actorEmail }).returning();
    await db.insert(auditEvents).values({ patientId: PATIENT_ID, actorEmail, action: "recording_created", resourceType: "media_asset", resourceId: id, detail: `consent:${voiceConsent.version}` });
    return Response.json({ asset: { id: asset.id, kind: asset.kind, contentType: asset.contentType, sizeBytes: asset.sizeBytes, durationMs: asset.durationMs, recordedBy: asset.recordedBy, reviewStatus: asset.reviewStatus, createdAt: asset.createdAt } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save recording" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "Recording id is required" }, { status: 400 });
    const db = getDb();
    const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
    if (!asset) return Response.json({ error: "Recording not found" }, { status: 404 });
    const user = await getChatGPTUser();
    const actorEmail = user?.email ?? "patient-demo@elan.local";
    await env.MEDIA.delete(asset.storageKey);
    await db.update(mediaAssets).set({ reviewStatus: "deleted" }).where(eq(mediaAssets.id, id));
    await db.insert(auditEvents).values({ patientId: PATIENT_ID, actorEmail, action: "recording_deleted", resourceType: "media_asset", resourceId: id });
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to delete recording" }, { status: 500 });
  }
}
