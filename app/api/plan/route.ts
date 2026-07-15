import { env } from "cloudflare:workers";
import { ensureProductWorkspace } from "../product/route";
import { exerciseCatalog } from "./exerciseCatalog";

const PATIENT_ID = "patient-salah";
const CATEGORIES = new Set(["appointment", "todo", "diet", "exercise"]);
const ACTOR_ROLES = new Set(["patient", "family", "admin"]);

type PlanRow = {
  id: string; patient_id: string; category: string; title_fr: string; title_en: string;
  description_fr: string; description_en: string; scheduled_at: string | null; status: string;
  source: string; created_by_role: string; created_by_name: string; evidence_title: string | null;
  evidence_url: string | null; safety_class: string; points: number; exercise_library_id: string | null;
  session_id: string | null; created_at: string; updated_at: string;
};

type LibraryRow = {
  id: string; domain: string; theme: string; title_fr: string; title_en: string; summary_fr: string;
  summary_en: string; instructions_fr: string; instructions_en: string; assistance_fr: string;
  assistance_en: string; evidence_title: string; evidence_url: string; safety_class: string;
  review_required: number; difficulty: number; effort_level: number; duration_minutes: number;
  stage: string; equipment_fr: string; equipment_en: string;
};

type SessionRow = {
  id: string; patient_id: string; title_fr: string; title_en: string; target_duration: number;
  effort_level: number; status: string; created_by_role: string; created_by_name: string;
  created_at: string; updated_at: string;
};

let planWorkspacePromise: Promise<void> | null = null;

async function addMissingColumns(table: string, columns: Array<{ name: string; definition: string }>) {
  const info = await env.DB.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  const existing = new Set(info.results.map((column) => column.name));
  const statements = columns
    .filter((column) => !existing.has(column.name))
    .map((column) => env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column.name} ${column.definition}`));
  if (statements.length) await env.DB.batch(statements);
}

async function initializePlanWorkspace() {
  await ensureProductWorkspace();
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS exercise_library (id TEXT PRIMARY KEY NOT NULL, domain TEXT NOT NULL, theme TEXT DEFAULT 'general' NOT NULL, title_fr TEXT NOT NULL, title_en TEXT NOT NULL, summary_fr TEXT NOT NULL, summary_en TEXT NOT NULL, instructions_fr TEXT NOT NULL, instructions_en TEXT NOT NULL, assistance_fr TEXT NOT NULL, assistance_en TEXT NOT NULL, evidence_title TEXT NOT NULL, evidence_url TEXT NOT NULL, safety_class TEXT NOT NULL, review_required INTEGER DEFAULT true NOT NULL, difficulty INTEGER DEFAULT 1 NOT NULL, effort_level INTEGER DEFAULT 1 NOT NULL, duration_minutes INTEGER DEFAULT 10 NOT NULL, stage TEXT DEFAULT 'foundation' NOT NULL, equipment_fr TEXT DEFAULT '' NOT NULL, equipment_en TEXT DEFAULT '' NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS plan_sessions (id TEXT PRIMARY KEY NOT NULL, patient_id TEXT NOT NULL, title_fr TEXT NOT NULL, title_en TEXT NOT NULL, target_duration INTEGER NOT NULL, effort_level INTEGER NOT NULL, status TEXT DEFAULT 'active' NOT NULL, created_by_role TEXT NOT NULL, created_by_name TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (patient_id) REFERENCES patient_profiles(id))"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS plan_entries (id TEXT PRIMARY KEY NOT NULL, patient_id TEXT NOT NULL, category TEXT NOT NULL, title_fr TEXT NOT NULL, title_en TEXT NOT NULL, description_fr TEXT DEFAULT '' NOT NULL, description_en TEXT DEFAULT '' NOT NULL, scheduled_at TEXT, status TEXT DEFAULT 'active' NOT NULL, source TEXT DEFAULT 'manual' NOT NULL, created_by_role TEXT NOT NULL, created_by_name TEXT NOT NULL, evidence_title TEXT, evidence_url TEXT, safety_class TEXT DEFAULT 'standard' NOT NULL, points INTEGER DEFAULT 10 NOT NULL, exercise_library_id TEXT, session_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (patient_id) REFERENCES patient_profiles(id), FOREIGN KEY (exercise_library_id) REFERENCES exercise_library(id), FOREIGN KEY (session_id) REFERENCES plan_sessions(id))"),
  ]);

  await addMissingColumns("exercise_library", [
    { name: "theme", definition: "TEXT DEFAULT 'general' NOT NULL" },
    { name: "effort_level", definition: "INTEGER DEFAULT 1 NOT NULL" },
    { name: "duration_minutes", definition: "INTEGER DEFAULT 10 NOT NULL" },
    { name: "stage", definition: "TEXT DEFAULT 'foundation' NOT NULL" },
    { name: "equipment_fr", definition: "TEXT DEFAULT '' NOT NULL" },
    { name: "equipment_en", definition: "TEXT DEFAULT '' NOT NULL" },
  ]);
  await addMissingColumns("plan_entries", [{ name: "session_id", definition: "TEXT" }]);

  const libraryStatements = exerciseCatalog.map((item) => env.DB.prepare("INSERT INTO exercise_library (id, domain, theme, title_fr, title_en, summary_fr, summary_en, instructions_fr, instructions_en, assistance_fr, assistance_en, evidence_title, evidence_url, safety_class, review_required, difficulty, effort_level, duration_minutes, stage, equipment_fr, equipment_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET domain = excluded.domain, theme = excluded.theme, title_fr = excluded.title_fr, title_en = excluded.title_en, summary_fr = excluded.summary_fr, summary_en = excluded.summary_en, instructions_fr = excluded.instructions_fr, instructions_en = excluded.instructions_en, assistance_fr = excluded.assistance_fr, assistance_en = excluded.assistance_en, evidence_title = excluded.evidence_title, evidence_url = excluded.evidence_url, safety_class = excluded.safety_class, review_required = excluded.review_required, difficulty = excluded.difficulty, effort_level = excluded.effort_level, duration_minutes = excluded.duration_minutes, stage = excluded.stage, equipment_fr = excluded.equipment_fr, equipment_en = excluded.equipment_en")
    .bind(item.id, item.domain, item.theme, item.titleFr, item.titleEn, item.summaryFr, item.summaryEn, item.instructionsFr, item.instructionsEn, item.assistanceFr, item.assistanceEn, item.evidenceTitle, item.evidenceUrl, item.safetyClass, item.reviewRequired ? 1 : 0, item.difficulty, item.effortLevel, item.durationMinutes, item.stage, item.equipmentFr, item.equipmentEn));

  const planStatements = [
    env.DB.prepare("INSERT OR IGNORE INTO plan_entries (id, patient_id, category, title_fr, title_en, description_fr, description_en, scheduled_at, source, created_by_role, created_by_name, safety_class, points) VALUES (?, ?, 'appointment', ?, ?, ?, ?, ?, 'curated', 'admin', 'Équipe Élan', 'standard', 20)").bind("plan-appointment-slp", PATIENT_ID, "Orthophonie — Marie-Claude", "Speech therapy — Marie-Claude", "Préparer les trois phrases personnelles à réviser.", "Prepare the three personal phrases to review.", "2026-07-16T10:30:00-04:00"),
    env.DB.prepare("INSERT OR IGNORE INTO plan_entries (id, patient_id, category, title_fr, title_en, description_fr, description_en, scheduled_at, source, created_by_role, created_by_name, safety_class, points) VALUES (?, ?, 'todo', ?, ?, ?, ?, ?, 'curated', 'admin', 'Équipe Élan', 'standard', 10)").bind("plan-todo-questions", PATIENT_ID, "Choisir 3 questions pour le rendez-vous", "Choose 3 questions for the appointment", "Écrire, enregistrer ou montrer les questions — toutes les formes sont valides.", "Write, record, or point to the questions — every form is valid.", "2026-07-15T18:00:00-04:00"),
    env.DB.prepare("INSERT OR IGNORE INTO plan_entries (id, patient_id, category, title_fr, title_en, description_fr, description_en, source, created_by_role, created_by_name, evidence_title, evidence_url, safety_class, points) VALUES (?, ?, 'diet', ?, ?, ?, ?, 'curated', 'admin', 'Équipe Élan', ?, ?, 'standard', 10)").bind("plan-diet-balanced", PATIENT_ID, "Repère d’assiette cœur-santé", "Heart-healthy plate cue", "Prévoir légumes ou fruits, grains entiers et une source de protéines peu transformée selon votre plan alimentaire. Les textures et liquides restent exactement ceux prescrits par votre équipe.", "Plan vegetables or fruit, whole grains, and a minimally processed protein source according to your food plan. Keep textures and fluids exactly as prescribed by your team.", "Canadian Stroke Best Practices — Healthy Balanced Diet", "https://www.strokebestpractices.ca/recommendations/secondary-prevention-of-stroke/lifestyle-behaviours-and-risk-factor-management"),
    env.DB.prepare("INSERT OR IGNORE INTO plan_entries (id, patient_id, category, title_fr, title_en, description_fr, description_en, source, created_by_role, created_by_name, evidence_title, evidence_url, safety_class, points, exercise_library_id) SELECT ?, ?, 'exercise', title_fr, title_en, instructions_fr, instructions_en, 'curated', 'admin', 'Équipe Élan', evidence_title, evidence_url, safety_class, 20, id FROM exercise_library WHERE id = ?").bind("plan-exercise-semantic", PATIENT_ID, "communication-carte-semantique-boissons"),
  ];
  await env.DB.batch([...libraryStatements, ...planStatements]);
}

export function ensurePlanWorkspace() {
  planWorkspacePromise ??= initializePlanWorkspace().catch((error) => {
    planWorkspacePromise = null;
    throw error;
  });
  return planWorkspacePromise;
}

function actorName(role: string) {
  if (role === "admin") return "Équipe Élan";
  if (role === "family") return "Sylvie";
  return "Salah";
}

function actorEmail(role: string) {
  if (role === "admin") return "admin@elan.local";
  if (role === "family") return "sylvie@elan.local";
  return "salah@elan.local";
}

function toPlanEntry(row: PlanRow) {
  return {
    id: row.id, patientId: row.patient_id, category: row.category,
    titleFr: row.title_fr, titleEn: row.title_en,
    descriptionFr: row.description_fr, descriptionEn: row.description_en,
    scheduledAt: row.scheduled_at, status: row.status, source: row.source,
    createdByRole: row.created_by_role, createdByName: row.created_by_name,
    evidenceTitle: row.evidence_title, evidenceUrl: row.evidence_url,
    safetyClass: row.safety_class, points: row.points,
    exerciseLibraryId: row.exercise_library_id, sessionId: row.session_id,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function toLibraryItem(row: LibraryRow) {
  return {
    id: row.id, domain: row.domain, theme: row.theme,
    titleFr: row.title_fr, titleEn: row.title_en,
    summaryFr: row.summary_fr, summaryEn: row.summary_en,
    instructionsFr: row.instructions_fr, instructionsEn: row.instructions_en,
    assistanceFr: row.assistance_fr, assistanceEn: row.assistance_en,
    evidenceTitle: row.evidence_title, evidenceUrl: row.evidence_url,
    safetyClass: row.safety_class, reviewRequired: Boolean(row.review_required),
    difficulty: row.difficulty, effortLevel: row.effort_level,
    durationMinutes: row.duration_minutes, stage: row.stage,
    equipmentFr: row.equipment_fr, equipmentEn: row.equipment_en,
  };
}

function toSession(row: SessionRow) {
  return {
    id: row.id, patientId: row.patient_id, titleFr: row.title_fr, titleEn: row.title_en,
    targetDuration: row.target_duration, effortLevel: row.effort_level, status: row.status,
    createdByRole: row.created_by_role, createdByName: row.created_by_name,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

async function readPlan() {
  const [entries, library, sessions] = await Promise.all([
    env.DB.prepare("SELECT * FROM plan_entries WHERE patient_id = ? ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END, COALESCE(scheduled_at, created_at), created_at DESC").bind(PATIENT_ID).all<PlanRow>(),
    env.DB.prepare("SELECT * FROM exercise_library ORDER BY domain, difficulty, duration_minutes, title_fr").all<LibraryRow>(),
    env.DB.prepare("SELECT * FROM plan_sessions WHERE patient_id = ? ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, created_at DESC").bind(PATIENT_ID).all<SessionRow>(),
  ]);
  return { entries: entries.results.map(toPlanEntry), library: library.results.map(toLibraryItem), sessions: sessions.results.map(toSession) };
}

export async function GET() {
  try {
    await ensurePlanWorkspace();
    return Response.json(await readPlan());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load plan" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensurePlanWorkspace();
    const payload = await request.json() as Record<string, unknown>;
    const createdByRole = String(payload.createdByRole ?? "patient");
    if (!ACTOR_ROLES.has(createdByRole)) return Response.json({ error: "Invalid plan author" }, { status: 400 });
    const createdByName = actorName(createdByRole);

    if (payload.kind === "session") {
      const templateIds = [...new Set(Array.isArray(payload.templateIds) ? payload.templateIds.map(String) : [])].slice(0, 8);
      const targetDuration = Math.max(5, Math.min(60, Number(payload.targetDuration) || 15));
      const effortLevel = Math.max(1, Math.min(5, Number(payload.effortLevel) || 2));
      if (!templateIds.length) return Response.json({ error: "Choose at least one exercise" }, { status: 400 });
      const placeholders = templateIds.map(() => "?").join(", ");
      const templates = await env.DB.prepare(`SELECT * FROM exercise_library WHERE id IN (${placeholders})`).bind(...templateIds).all<LibraryRow>();
      if (templates.results.length !== templateIds.length) return Response.json({ error: "One or more exercises were not found" }, { status: 404 });

      const sessionId = `session-${crypto.randomUUID()}`;
      const sessionNumber = await env.DB.prepare("SELECT COUNT(*) AS total FROM plan_sessions WHERE patient_id = ?").bind(PATIENT_ID).first<{ total: number }>();
      const sequence = Number(sessionNumber?.total ?? 0) + 1;
      await env.DB.prepare("INSERT INTO plan_sessions (id, patient_id, title_fr, title_en, target_duration, effort_level, status, created_by_role, created_by_name) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)")
        .bind(sessionId, PATIENT_ID, `Séance ${sequence} · ${targetDuration} min`, `Session ${sequence} · ${targetDuration} min`, targetDuration, effortLevel, createdByRole, createdByName).run();
      const entryStatements = templates.results.map((template) => env.DB.prepare("INSERT INTO plan_entries (id, patient_id, category, title_fr, title_en, description_fr, description_en, status, source, created_by_role, created_by_name, evidence_title, evidence_url, safety_class, points, exercise_library_id, session_id) VALUES (?, ?, 'exercise', ?, ?, ?, ?, 'active', 'curated', ?, ?, ?, ?, ?, 20, ?, ?)")
        .bind(`plan-${crypto.randomUUID()}`, PATIENT_ID, template.title_fr, template.title_en, template.instructions_fr, template.instructions_en, createdByRole, createdByName, template.evidence_title, template.evidence_url, template.safety_class, template.id, sessionId));
      await env.DB.batch(entryStatements);
      await env.DB.prepare("INSERT INTO audit_events (patient_id, actor_email, action, resource_type, resource_id, detail) VALUES (?, ?, 'plan_session.created', 'plan_session', ?, ?)")
        .bind(PATIENT_ID, actorEmail(createdByRole), sessionId, `${templates.results.length} exercises`).run();
      const result = await readPlan();
      return Response.json({ session: result.sessions.find((item) => item.id === sessionId), entries: result.entries.filter((item) => item.sessionId === sessionId) }, { status: 201 });
    }

    const templateId = String(payload.templateId ?? "").trim();
    const id = `plan-${crypto.randomUUID()}`;
    if (templateId) {
      const template = await env.DB.prepare("SELECT * FROM exercise_library WHERE id = ?").bind(templateId).first<LibraryRow>();
      if (!template) return Response.json({ error: "Exercise template not found" }, { status: 404 });
      await env.DB.prepare("INSERT INTO plan_entries (id, patient_id, category, title_fr, title_en, description_fr, description_en, status, source, created_by_role, created_by_name, evidence_title, evidence_url, safety_class, points, exercise_library_id) VALUES (?, ?, 'exercise', ?, ?, ?, ?, 'active', 'curated', ?, ?, ?, ?, ?, 20, ?)")
        .bind(id, PATIENT_ID, template.title_fr, template.title_en, template.instructions_fr, template.instructions_en, createdByRole, createdByName, template.evidence_title, template.evidence_url, template.safety_class, template.id).run();
    } else {
      const category = String(payload.category ?? "todo");
      const title = String(payload.title ?? "").trim().slice(0, 120);
      const description = String(payload.description ?? "").trim().slice(0, 800);
      const scheduledAt = String(payload.scheduledAt ?? "").trim() || null;
      if (!CATEGORIES.has(category) || !title) return Response.json({ error: "A valid category and title are required" }, { status: 400 });
      const safetyClass = category === "exercise" ? "clinical_review" : "standard";
      await env.DB.prepare("INSERT INTO plan_entries (id, patient_id, category, title_fr, title_en, description_fr, description_en, scheduled_at, status, source, created_by_role, created_by_name, safety_class, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 'manual', ?, ?, ?, 10)")
        .bind(id, PATIENT_ID, category, title, title, description, description, scheduledAt, createdByRole, createdByName, safetyClass).run();
    }

    await env.DB.prepare("INSERT INTO audit_events (patient_id, actor_email, action, resource_type, resource_id, detail) VALUES (?, ?, 'plan_entry.created', 'plan_entry', ?, ?)")
      .bind(PATIENT_ID, actorEmail(createdByRole), id, templateId ? `curated:${templateId}` : "manual").run();
    const row = await env.DB.prepare("SELECT * FROM plan_entries WHERE id = ?").bind(id).first<PlanRow>();
    return Response.json({ entry: row ? toPlanEntry(row) : null }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to add plan entry" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await ensurePlanWorkspace();
    const payload = await request.json() as Record<string, unknown>;
    const id = String(payload.id ?? "");
    const status = String(payload.status ?? "");
    const createdByRole = String(payload.createdByRole ?? "patient");
    if (!id || !["active", "completed", "paused"].includes(status) || !ACTOR_ROLES.has(createdByRole)) {
      return Response.json({ error: "Invalid plan update" }, { status: 400 });
    }
    const existing = await env.DB.prepare("SELECT * FROM plan_entries WHERE id = ? AND patient_id = ?").bind(id, PATIENT_ID).first<PlanRow>();
    if (!existing) return Response.json({ error: "Plan entry not found" }, { status: 404 });
    await env.DB.prepare("UPDATE plan_entries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND patient_id = ?").bind(status, id, PATIENT_ID).run();
    if (existing.session_id) {
      const remaining = await env.DB.prepare("SELECT COUNT(*) AS total FROM plan_entries WHERE session_id = ? AND status != 'completed'").bind(existing.session_id).first<{ total: number }>();
      await env.DB.prepare("UPDATE plan_sessions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(Number(remaining?.total ?? 0) === 0 ? "completed" : "active", existing.session_id).run();
    }
    await env.DB.prepare("INSERT INTO audit_events (patient_id, actor_email, action, resource_type, resource_id, detail) VALUES (?, ?, 'plan_entry.status_changed', 'plan_entry', ?, ?)")
      .bind(PATIENT_ID, actorEmail(createdByRole), id, status).run();
    const row = await env.DB.prepare("SELECT * FROM plan_entries WHERE id = ?").bind(id).first<PlanRow>();
    return Response.json({ entry: row ? toPlanEntry(row) : null });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update plan" }, { status: 500 });
  }
}
