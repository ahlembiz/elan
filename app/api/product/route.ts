import { desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { assignments, attempts, exercises, goals, observations, patientProfiles, users } from "../../../db/schema";

const PATIENT_ID = "patient-salah";

async function ensureDemoWorkspace() {
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, role TEXT NOT NULL, locale TEXT DEFAULT 'fr-CA' NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS patient_profiles (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, preferred_name TEXT NOT NULL, preferred_language TEXT DEFAULT 'fr-CA' NOT NULL, primary_goal TEXT NOT NULL, supervision_summary TEXT NOT NULL, next_review_date TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id))"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS goals (id TEXT PRIMARY KEY NOT NULL, patient_id TEXT NOT NULL, domain TEXT NOT NULL, title TEXT NOT NULL, status TEXT DEFAULT 'active' NOT NULL, progress_note TEXT DEFAULT '' NOT NULL, review_date TEXT NOT NULL, FOREIGN KEY (patient_id) REFERENCES patient_profiles(id))"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS exercises (id TEXT PRIMARY KEY NOT NULL, domain TEXT NOT NULL, title_fr TEXT NOT NULL, title_en TEXT NOT NULL, instructions_fr TEXT NOT NULL, instructions_en TEXT NOT NULL, assistance_level TEXT NOT NULL, repetitions TEXT NOT NULL, safety_note_fr TEXT DEFAULT '' NOT NULL, safety_note_en TEXT DEFAULT '' NOT NULL, clinician_name TEXT NOT NULL, reviewed_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS assignments (id TEXT PRIMARY KEY NOT NULL, patient_id TEXT NOT NULL, exercise_id TEXT NOT NULL, scheduled_date TEXT NOT NULL, order_index INTEGER NOT NULL, status TEXT DEFAULT 'assigned' NOT NULL, FOREIGN KEY (patient_id) REFERENCES patient_profiles(id), FOREIGN KEY (exercise_id) REFERENCES exercises(id))"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS attempts (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, assignment_id TEXT NOT NULL, patient_id TEXT NOT NULL, support_level INTEGER NOT NULL, effort INTEGER NOT NULL, confidence INTEGER NOT NULL, warning_symptom TEXT, completed_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (assignment_id) REFERENCES assignments(id), FOREIGN KEY (patient_id) REFERENCES patient_profiles(id))"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS observations (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, patient_id TEXT NOT NULL, author_name TEXT NOT NULL, author_role TEXT NOT NULL, category TEXT NOT NULL, note TEXT NOT NULL, status TEXT DEFAULT 'new' NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (patient_id) REFERENCES patient_profiles(id))"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS alerts (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, patient_id TEXT NOT NULL, severity TEXT NOT NULL, source TEXT NOT NULL, message TEXT NOT NULL, status TEXT DEFAULT 'open' NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (patient_id) REFERENCES patient_profiles(id))"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS care_links (id TEXT PRIMARY KEY NOT NULL, patient_id TEXT NOT NULL, user_id TEXT NOT NULL, relationship TEXT NOT NULL, can_view_recordings INTEGER DEFAULT false NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (patient_id) REFERENCES patient_profiles(id), FOREIGN KEY (user_id) REFERENCES users(id))"),
  ]);

  const db = getDb();
  await db.insert(users).values({ id: "user-salah", email: "salah@demo.elan", displayName: "Salah", role: "patient" }).onConflictDoNothing();
  await db.insert(users).values({ id: "user-sylvie", email: "sylvie@demo.elan", displayName: "Sylvie", role: "family" }).onConflictDoNothing();
  await db.insert(users).values({ id: "user-marie", email: "marie-claude@demo.elan", displayName: "Marie-Claude", role: "clinician" }).onConflictDoNothing();
  await db.insert(patientProfiles).values({ id: PATIENT_ID, userId: "user-salah", preferredName: "Salah", primaryGoal: "Demander ce dont j’ai besoin avec plus d’autonomie", supervisionSummary: "Quelqu’un à proximité pour les transferts et exercices debout", nextReviewDate: "2026-07-16" }).onConflictDoNothing();
  await db.insert(goals).values([
    { id: "goal-communication", patientId: PATIENT_ID, domain: "communication", title: "Utiliser une phrase utile avec un seul indice", progressNote: "5 mots personnels demandent moins d’aide", reviewDate: "2026-07-16" },
    { id: "goal-mobility", patientId: PATIENT_ID, domain: "mobility", title: "Se lever d’une chaise avec supervision", progressNote: "5 répétitions complétées à effort modéré", reviewDate: "2026-07-18" },
    { id: "goal-participation", patientId: PATIENT_ID, domain: "participation", title: "Demander un verre d’eau dans la cuisine", progressNote: "Mission réussie 3 fois cette semaine", reviewDate: "2026-07-20" },
  ]).onConflictDoNothing();
  await db.insert(exercises).values([
    { id: "exercise-words", domain: "communication", titleFr: "Mes mots importants", titleEn: "My important words", instructionsFr: "Dites, montrez ou écrivez le mot.", instructionsEn: "Say, point to, or write the word.", assistanceLevel: "Indices gradués", repetitions: "3 mots", clinicianName: "Marie-Claude", reviewedAt: "2026-07-10" },
    { id: "exercise-chair", domain: "mobility", titleFr: "Se lever d’une chaise", titleEn: "Stand up from a chair", instructionsFr: "Pieds au sol. Penchez-vous vers l’avant.", instructionsEn: "Feet on the floor. Lean forward.", assistanceLevel: "Quelqu’un à proximité", repetitions: "5 répétitions", safetyNoteFr: "Arrêtez en cas de douleur ou d’étourdissement.", safetyNoteEn: "Stop if you feel pain or dizziness.", clinicianName: "Karim B.", reviewedAt: "2026-07-11" },
    { id: "exercise-kitchen", domain: "participation", titleFr: "Mission dans la cuisine", titleEn: "Kitchen mission", instructionsFr: "Demandez un verre d’eau à votre façon.", instructionsEn: "Ask for a glass of water in your own way.", assistanceLevel: "Partenaire disponible", repetitions: "1 mission", clinicianName: "Marie-Claude", reviewedAt: "2026-07-10" },
  ]).onConflictDoNothing();
  await db.insert(assignments).values([
    { id: "assignment-words", patientId: PATIENT_ID, exerciseId: "exercise-words", scheduledDate: "2026-07-14", orderIndex: 1 },
    { id: "assignment-chair", patientId: PATIENT_ID, exerciseId: "exercise-chair", scheduledDate: "2026-07-14", orderIndex: 2 },
    { id: "assignment-kitchen", patientId: PATIENT_ID, exerciseId: "exercise-kitchen", scheduledDate: "2026-07-14", orderIndex: 3 },
  ]).onConflictDoNothing();
}

export async function GET() {
  try {
    await ensureDemoWorkspace();
    const db = getDb();
    const [profile] = await db.select().from(patientProfiles).where(eq(patientProfiles.id, PATIENT_ID)).limit(1);
    const patientGoals = await db.select().from(goals).where(eq(goals.patientId, PATIENT_ID));
    const program = await db.select({ assignment: assignments, exercise: exercises }).from(assignments).innerJoin(exercises, eq(assignments.exerciseId, exercises.id)).where(eq(assignments.patientId, PATIENT_ID)).orderBy(assignments.orderIndex);
    const recentAttempts = await db.select().from(attempts).where(eq(attempts.patientId, PATIENT_ID)).orderBy(desc(attempts.completedAt)).limit(12);
    const recentObservations = await db.select().from(observations).where(eq(observations.patientId, PATIENT_ID)).orderBy(desc(observations.createdAt)).limit(12);
    return Response.json({ profile, goals: patientGoals, program, attempts: recentAttempts, observations: recentObservations });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load workspace" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDemoWorkspace();
    const payload = await request.json() as Record<string, unknown>;
    const db = getDb();
    if (payload.kind === "observation") {
      const note = String(payload.note ?? "").trim();
      if (!note) return Response.json({ error: "Observation text is required" }, { status: 400 });
      const [observation] = await db.insert(observations).values({ patientId: PATIENT_ID, authorName: String(payload.authorName ?? "Sylvie"), authorRole: "family", category: String(payload.category ?? "communication"), note }).returning();
      return Response.json({ observation }, { status: 201 });
    }
    if (payload.kind === "session_complete") {
      const [attempt] = await db.insert(attempts).values({ assignmentId: "assignment-kitchen", patientId: PATIENT_ID, supportLevel: Number(payload.supportLevel ?? 3), effort: Number(payload.effort ?? 3), confidence: Number(payload.confidence ?? 3) }).returning();
      return Response.json({ attempt }, { status: 201 });
    }
    return Response.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save" }, { status: 500 });
  }
}
