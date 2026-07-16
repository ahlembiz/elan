import { desc, eq } from "drizzle-orm";
import { getDb, sqlite } from "../../../db";
import { requireApiSession } from "../../../lib/session";
import { assignments, attempts, consents, exercises, goals, mediaAssets, observations, patientProfiles } from "../../../db/schema";

const PATIENT_ID = "patient-salah";

let productWorkspacePromise: Promise<void> | null = null;

async function initializeProductWorkspace() {
  await sqlite.batch([
    sqlite.prepare("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, role TEXT NOT NULL, locale TEXT DEFAULT 'fr-CA' NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    sqlite.prepare("CREATE TABLE IF NOT EXISTS patient_profiles (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, preferred_name TEXT NOT NULL, preferred_language TEXT DEFAULT 'fr-CA' NOT NULL, primary_goal TEXT NOT NULL, supervision_summary TEXT NOT NULL, next_review_date TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id))"),
    sqlite.prepare("CREATE TABLE IF NOT EXISTS goals (id TEXT PRIMARY KEY NOT NULL, patient_id TEXT NOT NULL, domain TEXT NOT NULL, title TEXT NOT NULL, status TEXT DEFAULT 'active' NOT NULL, progress_note TEXT DEFAULT '' NOT NULL, review_date TEXT NOT NULL, FOREIGN KEY (patient_id) REFERENCES patient_profiles(id))"),
    sqlite.prepare("CREATE TABLE IF NOT EXISTS exercises (id TEXT PRIMARY KEY NOT NULL, domain TEXT NOT NULL, title_fr TEXT NOT NULL, title_en TEXT NOT NULL, instructions_fr TEXT NOT NULL, instructions_en TEXT NOT NULL, assistance_level TEXT NOT NULL, repetitions TEXT NOT NULL, safety_note_fr TEXT DEFAULT '' NOT NULL, safety_note_en TEXT DEFAULT '' NOT NULL, clinician_name TEXT NOT NULL, reviewed_at TEXT NOT NULL)"),
    sqlite.prepare("CREATE TABLE IF NOT EXISTS assignments (id TEXT PRIMARY KEY NOT NULL, patient_id TEXT NOT NULL, exercise_id TEXT NOT NULL, scheduled_date TEXT NOT NULL, order_index INTEGER NOT NULL, status TEXT DEFAULT 'assigned' NOT NULL, FOREIGN KEY (patient_id) REFERENCES patient_profiles(id), FOREIGN KEY (exercise_id) REFERENCES exercises(id))"),
    sqlite.prepare("CREATE TABLE IF NOT EXISTS attempts (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, assignment_id TEXT NOT NULL, patient_id TEXT NOT NULL, support_level INTEGER NOT NULL, effort INTEGER NOT NULL, confidence INTEGER NOT NULL, warning_symptom TEXT, completed_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (assignment_id) REFERENCES assignments(id), FOREIGN KEY (patient_id) REFERENCES patient_profiles(id))"),
    sqlite.prepare("CREATE TABLE IF NOT EXISTS observations (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, patient_id TEXT NOT NULL, author_name TEXT NOT NULL, author_role TEXT NOT NULL, category TEXT NOT NULL, note TEXT NOT NULL, status TEXT DEFAULT 'new' NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (patient_id) REFERENCES patient_profiles(id))"),
    sqlite.prepare("CREATE TABLE IF NOT EXISTS alerts (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, patient_id TEXT NOT NULL, severity TEXT NOT NULL, source TEXT NOT NULL, message TEXT NOT NULL, status TEXT DEFAULT 'open' NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (patient_id) REFERENCES patient_profiles(id))"),
    sqlite.prepare("CREATE TABLE IF NOT EXISTS care_links (id TEXT PRIMARY KEY NOT NULL, patient_id TEXT NOT NULL, user_id TEXT NOT NULL, relationship TEXT NOT NULL, can_view_recordings INTEGER DEFAULT false NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (patient_id) REFERENCES patient_profiles(id), FOREIGN KEY (user_id) REFERENCES users(id))"),
    sqlite.prepare("CREATE TABLE IF NOT EXISTS consents (id TEXT PRIMARY KEY NOT NULL, patient_id TEXT NOT NULL, consent_type TEXT NOT NULL, granted INTEGER DEFAULT false NOT NULL, version TEXT DEFAULT '1.0' NOT NULL, actor_email TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (patient_id) REFERENCES patient_profiles(id))"),
    sqlite.prepare("CREATE TABLE IF NOT EXISTS media_assets (id TEXT PRIMARY KEY NOT NULL, patient_id TEXT NOT NULL, assignment_id TEXT, kind TEXT NOT NULL, storage_key TEXT NOT NULL UNIQUE, content_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, duration_ms INTEGER, recorded_by TEXT NOT NULL, review_status TEXT DEFAULT 'new' NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (patient_id) REFERENCES patient_profiles(id), FOREIGN KEY (assignment_id) REFERENCES assignments(id))"),
    sqlite.prepare("CREATE TABLE IF NOT EXISTS audit_events (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, patient_id TEXT, actor_email TEXT NOT NULL, action TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id TEXT, detail TEXT DEFAULT '' NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (patient_id) REFERENCES patient_profiles(id))"),
  ]);

  await sqlite.batch([
    sqlite.prepare("INSERT OR IGNORE INTO users (id, email, display_name, role) VALUES ('user-salah', 'salah@elan.local', 'Salah', 'patient')"),
    sqlite.prepare("INSERT OR IGNORE INTO users (id, email, display_name, role) VALUES ('user-sylvie', 'sylvie@elan.local', 'Sylvie', 'family')"),
    sqlite.prepare("INSERT OR IGNORE INTO users (id, email, display_name, role) VALUES ('user-admin', 'admin@elan.local', 'Équipe Élan', 'admin')"),
    sqlite.prepare("INSERT OR IGNORE INTO patient_profiles (id, user_id, preferred_name, primary_goal, supervision_summary, next_review_date) VALUES (?, 'user-salah', 'Salah', ?, ?, '2026-07-16')").bind(PATIENT_ID, "Demander ce dont j’ai besoin avec plus d’autonomie", "Quelqu’un à proximité pour les transferts et exercices debout"),
    sqlite.prepare("INSERT OR IGNORE INTO goals (id, patient_id, domain, title, progress_note, review_date) VALUES ('goal-communication', ?, 'communication', ?, ?, '2026-07-16')").bind(PATIENT_ID, "Utiliser une phrase utile avec un seul indice", "5 mots personnels demandent moins d’aide"),
    sqlite.prepare("INSERT OR IGNORE INTO goals (id, patient_id, domain, title, progress_note, review_date) VALUES ('goal-mobility', ?, 'mobility', ?, ?, '2026-07-18')").bind(PATIENT_ID, "Se lever d’une chaise avec supervision", "5 répétitions complétées à effort modéré"),
    sqlite.prepare("INSERT OR IGNORE INTO goals (id, patient_id, domain, title, progress_note, review_date) VALUES ('goal-participation', ?, 'participation', ?, ?, '2026-07-20')").bind(PATIENT_ID, "Demander un verre d’eau dans la cuisine", "Mission réussie 3 fois cette semaine"),
    sqlite.prepare("INSERT OR IGNORE INTO exercises (id, domain, title_fr, title_en, instructions_fr, instructions_en, assistance_level, repetitions, clinician_name, reviewed_at) VALUES ('exercise-words', 'communication', 'Mes mots importants', 'My important words', 'Dites, montrez ou écrivez le mot.', 'Say, point to, or write the word.', 'Indices gradués', '3 mots', 'Marie-Claude', '2026-07-10')"),
    sqlite.prepare("INSERT OR IGNORE INTO exercises (id, domain, title_fr, title_en, instructions_fr, instructions_en, assistance_level, repetitions, safety_note_fr, safety_note_en, clinician_name, reviewed_at) VALUES ('exercise-chair', 'mobility', 'Se lever d’une chaise', 'Stand up from a chair', 'Pieds au sol. Penchez-vous vers l’avant.', 'Feet on the floor. Lean forward.', 'Quelqu’un à proximité', '5 répétitions', 'Arrêtez en cas de douleur ou d’étourdissement.', 'Stop if you feel pain or dizziness.', 'Karim B.', '2026-07-11')"),
    sqlite.prepare("INSERT OR IGNORE INTO exercises (id, domain, title_fr, title_en, instructions_fr, instructions_en, assistance_level, repetitions, clinician_name, reviewed_at) VALUES ('exercise-kitchen', 'participation', 'Mission dans la cuisine', 'Kitchen mission', 'Demandez un verre d’eau à votre façon.', 'Ask for a glass of water in your own way.', 'Partenaire disponible', '1 mission', 'Marie-Claude', '2026-07-10')"),
    sqlite.prepare("INSERT OR IGNORE INTO assignments (id, patient_id, exercise_id, scheduled_date, order_index) VALUES ('assignment-words', ?, 'exercise-words', '2026-07-14', 1)").bind(PATIENT_ID),
    sqlite.prepare("INSERT OR IGNORE INTO assignments (id, patient_id, exercise_id, scheduled_date, order_index) VALUES ('assignment-chair', ?, 'exercise-chair', '2026-07-14', 2)").bind(PATIENT_ID),
    sqlite.prepare("INSERT OR IGNORE INTO assignments (id, patient_id, exercise_id, scheduled_date, order_index) VALUES ('assignment-kitchen', ?, 'exercise-kitchen', '2026-07-14', 3)").bind(PATIENT_ID),
  ]);
}

export function ensureProductWorkspace() {
  productWorkspacePromise ??= initializeProductWorkspace().catch((error) => {
    productWorkspacePromise = null;
    throw error;
  });
  return productWorkspacePromise;
}

export async function GET(request: Request) {
  try {
    const auth = await requireApiSession(request, ["patient", "family", "admin"]);
    if ("response" in auth) return auth.response;
    await ensureProductWorkspace();
    const db = getDb();
    const [profile] = await db.select().from(patientProfiles).where(eq(patientProfiles.id, PATIENT_ID)).limit(1);
    const patientGoals = await db.select().from(goals).where(eq(goals.patientId, PATIENT_ID));
    const program = await db.select({ assignment: assignments, exercise: exercises }).from(assignments).innerJoin(exercises, eq(assignments.exerciseId, exercises.id)).where(eq(assignments.patientId, PATIENT_ID)).orderBy(assignments.orderIndex);
    const recentAttempts = await db.select().from(attempts).where(eq(attempts.patientId, PATIENT_ID)).orderBy(desc(attempts.completedAt)).limit(12);
    const recentObservations = await db.select().from(observations).where(eq(observations.patientId, PATIENT_ID)).orderBy(desc(observations.createdAt)).limit(12);
    const patientConsents = await db.select().from(consents).where(eq(consents.patientId, PATIENT_ID));
    const recordings = await db.select({ id: mediaAssets.id, kind: mediaAssets.kind, contentType: mediaAssets.contentType, sizeBytes: mediaAssets.sizeBytes, durationMs: mediaAssets.durationMs, recordedBy: mediaAssets.recordedBy, reviewStatus: mediaAssets.reviewStatus, createdAt: mediaAssets.createdAt }).from(mediaAssets).where(eq(mediaAssets.patientId, PATIENT_ID)).orderBy(desc(mediaAssets.createdAt)).limit(20);
    return Response.json({ profile, goals: patientGoals, program, attempts: recentAttempts, observations: recentObservations, consents: patientConsents, mediaAssets: recordings });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load workspace" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiSession(request, ["patient", "family", "admin"]);
    if ("response" in auth) return auth.response;
    await ensureProductWorkspace();
    const payload = await request.json() as Record<string, unknown>;
    const db = getDb();
    if (payload.kind === "observation") {
      if (!["family", "admin"].includes(auth.session.role)) {
        return Response.json({ error: "Only a family or administration account can add observations" }, { status: 403 });
      }
      const note = String(payload.note ?? "").trim();
      if (!note) return Response.json({ error: "Observation text is required" }, { status: 400 });
      const [observation] = await db.insert(observations).values({ patientId: PATIENT_ID, authorName: auth.session.name, authorRole: auth.session.role, category: String(payload.category ?? "communication"), note }).returning();
      return Response.json({ observation }, { status: 201 });
    }
    if (payload.kind === "session_complete") {
      if (!["patient", "family"].includes(auth.session.role)) {
        return Response.json({ error: "This account cannot complete a patient session" }, { status: 403 });
      }
      const [attempt] = await db.insert(attempts).values({ assignmentId: "assignment-kitchen", patientId: PATIENT_ID, supportLevel: Number(payload.supportLevel ?? 3), effort: Number(payload.effort ?? 3), confidence: Number(payload.confidence ?? 3) }).returning();
      return Response.json({ attempt }, { status: 201 });
    }
    return Response.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save" }, { status: 500 });
  }
}
