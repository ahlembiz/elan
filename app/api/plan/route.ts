import { sqlite } from "../../../db";
import { convexMutation, convexQuery, hasConvex, torontoDate } from "../../../lib/convex";
import { requireApiSession } from "../../../lib/session";
import { ensureProductWorkspace } from "../product/route";
import { exerciseCatalog } from "./exerciseCatalog";

const PATIENT_ID = "patient-salah";
const CATEGORIES = new Set(["appointment", "todo", "diet", "exercise"]);

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
  const info = await sqlite.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  const existing = new Set(info.results.map((column) => column.name));
  const statements = columns
    .filter((column) => !existing.has(column.name))
    .map((column) => sqlite.prepare(`ALTER TABLE ${table} ADD COLUMN ${column.name} ${column.definition}`));
  if (statements.length) await sqlite.batch(statements);
}

async function initializePlanWorkspace() {
  await ensureProductWorkspace();
  await sqlite.batch([
    sqlite.prepare("CREATE TABLE IF NOT EXISTS exercise_library (id TEXT PRIMARY KEY NOT NULL, domain TEXT NOT NULL, theme TEXT DEFAULT 'general' NOT NULL, title_fr TEXT NOT NULL, title_en TEXT NOT NULL, summary_fr TEXT NOT NULL, summary_en TEXT NOT NULL, instructions_fr TEXT NOT NULL, instructions_en TEXT NOT NULL, assistance_fr TEXT NOT NULL, assistance_en TEXT NOT NULL, evidence_title TEXT NOT NULL, evidence_url TEXT NOT NULL, safety_class TEXT NOT NULL, review_required INTEGER DEFAULT true NOT NULL, difficulty INTEGER DEFAULT 1 NOT NULL, effort_level INTEGER DEFAULT 1 NOT NULL, duration_minutes INTEGER DEFAULT 10 NOT NULL, stage TEXT DEFAULT 'foundation' NOT NULL, equipment_fr TEXT DEFAULT '' NOT NULL, equipment_en TEXT DEFAULT '' NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    sqlite.prepare("CREATE TABLE IF NOT EXISTS plan_sessions (id TEXT PRIMARY KEY NOT NULL, patient_id TEXT NOT NULL, title_fr TEXT NOT NULL, title_en TEXT NOT NULL, target_duration INTEGER NOT NULL, effort_level INTEGER NOT NULL, status TEXT DEFAULT 'active' NOT NULL, created_by_role TEXT NOT NULL, created_by_name TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (patient_id) REFERENCES patient_profiles(id))"),
    sqlite.prepare("CREATE TABLE IF NOT EXISTS plan_entries (id TEXT PRIMARY KEY NOT NULL, patient_id TEXT NOT NULL, category TEXT NOT NULL, title_fr TEXT NOT NULL, title_en TEXT NOT NULL, description_fr TEXT DEFAULT '' NOT NULL, description_en TEXT DEFAULT '' NOT NULL, scheduled_at TEXT, status TEXT DEFAULT 'active' NOT NULL, source TEXT DEFAULT 'manual' NOT NULL, created_by_role TEXT NOT NULL, created_by_name TEXT NOT NULL, evidence_title TEXT, evidence_url TEXT, safety_class TEXT DEFAULT 'standard' NOT NULL, points INTEGER DEFAULT 10 NOT NULL, exercise_library_id TEXT, session_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (patient_id) REFERENCES patient_profiles(id), FOREIGN KEY (exercise_library_id) REFERENCES exercise_library(id), FOREIGN KEY (session_id) REFERENCES plan_sessions(id))"),
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

  const libraryStatements = exerciseCatalog.map((item) => sqlite.prepare("INSERT INTO exercise_library (id, domain, theme, title_fr, title_en, summary_fr, summary_en, instructions_fr, instructions_en, assistance_fr, assistance_en, evidence_title, evidence_url, safety_class, review_required, difficulty, effort_level, duration_minutes, stage, equipment_fr, equipment_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET domain = excluded.domain, theme = excluded.theme, title_fr = excluded.title_fr, title_en = excluded.title_en, summary_fr = excluded.summary_fr, summary_en = excluded.summary_en, instructions_fr = excluded.instructions_fr, instructions_en = excluded.instructions_en, assistance_fr = excluded.assistance_fr, assistance_en = excluded.assistance_en, evidence_title = excluded.evidence_title, evidence_url = excluded.evidence_url, safety_class = excluded.safety_class, review_required = excluded.review_required, difficulty = excluded.difficulty, effort_level = excluded.effort_level, duration_minutes = excluded.duration_minutes, stage = excluded.stage, equipment_fr = excluded.equipment_fr, equipment_en = excluded.equipment_en")
    .bind(item.id, item.domain, item.theme, item.titleFr, item.titleEn, item.summaryFr, item.summaryEn, item.instructionsFr, item.instructionsEn, item.assistanceFr, item.assistanceEn, item.evidenceTitle, item.evidenceUrl, item.safetyClass, item.reviewRequired ? 1 : 0, item.difficulty, item.effortLevel, item.durationMinutes, item.stage, item.equipmentFr, item.equipmentEn));

  const planStatements = [
    sqlite.prepare("INSERT OR IGNORE INTO plan_entries (id, patient_id, category, title_fr, title_en, description_fr, description_en, scheduled_at, source, created_by_role, created_by_name, safety_class, points) VALUES (?, ?, 'appointment', ?, ?, ?, ?, ?, 'curated', 'admin', 'Équipe Élan', 'standard', 20)").bind("plan-appointment-slp", PATIENT_ID, "Orthophonie — Marie-Claude", "Speech therapy — Marie-Claude", "Préparer les trois phrases personnelles à réviser.", "Prepare the three personal phrases to review.", "2026-07-16T10:30:00-04:00"),
    sqlite.prepare("INSERT OR IGNORE INTO plan_entries (id, patient_id, category, title_fr, title_en, description_fr, description_en, scheduled_at, source, created_by_role, created_by_name, safety_class, points) VALUES (?, ?, 'todo', ?, ?, ?, ?, ?, 'curated', 'admin', 'Équipe Élan', 'standard', 10)").bind("plan-todo-questions", PATIENT_ID, "Choisir 3 questions pour le rendez-vous", "Choose 3 questions for the appointment", "Écrire, enregistrer ou montrer les questions — toutes les formes sont valides.", "Write, record, or point to the questions — every form is valid.", "2026-07-15T18:00:00-04:00"),
    sqlite.prepare("INSERT OR IGNORE INTO plan_entries (id, patient_id, category, title_fr, title_en, description_fr, description_en, source, created_by_role, created_by_name, evidence_title, evidence_url, safety_class, points) VALUES (?, ?, 'diet', ?, ?, ?, ?, 'curated', 'admin', 'Équipe Élan', ?, ?, 'standard', 10)").bind("plan-diet-balanced", PATIENT_ID, "Repère d’assiette cœur-santé", "Heart-healthy plate cue", "Prévoir légumes ou fruits, grains entiers et une source de protéines peu transformée selon votre plan alimentaire. Les textures et liquides restent exactement ceux prescrits par votre équipe.", "Plan vegetables or fruit, whole grains, and a minimally processed protein source according to your food plan. Keep textures and fluids exactly as prescribed by your team.", "Canadian Stroke Best Practices — Healthy Balanced Diet", "https://www.strokebestpractices.ca/recommendations/secondary-prevention-of-stroke/lifestyle-behaviours-and-risk-factor-management"),
    sqlite.prepare("INSERT OR IGNORE INTO plan_entries (id, patient_id, category, title_fr, title_en, description_fr, description_en, source, created_by_role, created_by_name, evidence_title, evidence_url, safety_class, points, exercise_library_id) SELECT ?, ?, 'exercise', title_fr, title_en, instructions_fr, instructions_en, 'curated', 'admin', 'Équipe Élan', evidence_title, evidence_url, safety_class, 20, id FROM exercise_library WHERE id = ?").bind("plan-exercise-semantic", PATIENT_ID, "communication-carte-semantique-boissons"),
  ];
  await sqlite.batch([...libraryStatements, ...planStatements]);
}

export function ensurePlanWorkspace() {
  planWorkspacePromise ??= initializePlanWorkspace().catch((error) => {
    planWorkspacePromise = null;
    throw error;
  });
  return planWorkspacePromise;
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

let frontendPlanRows: PlanRow[] | null = null;
const frontendSessionRows: SessionRow[] = [];

function usesFrontendData() {
  return !process.env.TURSO_DATABASE_URL;
}

function getFrontendPlanRows() {
  if (frontendPlanRows) return frontendPlanRows;
  const now = new Date().toISOString();
  const featuredExercise = exerciseCatalog.find((item) => item.id === "communication-carte-semantique-boissons") ?? exerciseCatalog[0];
  frontendPlanRows = [
    {
      id: "plan-appointment-slp", patient_id: PATIENT_ID, category: "appointment",
      title_fr: "Orthophonie — Marie-Claude", title_en: "Speech therapy — Marie-Claude",
      description_fr: "Préparer les trois phrases personnelles à réviser.", description_en: "Prepare the three personal phrases to review.",
      scheduled_at: "2026-07-16T10:30:00-04:00", status: "active", source: "curated",
      created_by_role: "admin", created_by_name: "Équipe Élan", evidence_title: null, evidence_url: null,
      safety_class: "standard", points: 20, exercise_library_id: null, session_id: null, created_at: now, updated_at: now,
    },
    {
      id: "plan-todo-questions", patient_id: PATIENT_ID, category: "todo",
      title_fr: "Choisir 3 questions pour le rendez-vous", title_en: "Choose 3 questions for the appointment",
      description_fr: "Écrire, enregistrer ou montrer les questions — toutes les formes sont valides.", description_en: "Write, record, or point to the questions—every form is valid.",
      scheduled_at: "2026-07-16T18:00:00-04:00", status: "active", source: "curated",
      created_by_role: "admin", created_by_name: "Équipe Élan", evidence_title: null, evidence_url: null,
      safety_class: "standard", points: 10, exercise_library_id: null, session_id: null, created_at: now, updated_at: now,
    },
    {
      id: "plan-diet-balanced", patient_id: PATIENT_ID, category: "diet",
      title_fr: "Repère d’assiette cœur-santé", title_en: "Heart-healthy plate cue",
      description_fr: "Prévoir légumes ou fruits, grains entiers et une source de protéines selon le plan alimentaire.", description_en: "Plan vegetables or fruit, whole grains, and a protein source according to the food plan.",
      scheduled_at: null, status: "active", source: "curated", created_by_role: "admin", created_by_name: "Équipe Élan",
      evidence_title: "Canadian Stroke Best Practices — Healthy Balanced Diet",
      evidence_url: "https://www.strokebestpractices.ca/recommendations/secondary-prevention-of-stroke/lifestyle-behaviours-and-risk-factor-management",
      safety_class: "standard", points: 10, exercise_library_id: null, session_id: null, created_at: now, updated_at: now,
    },
    {
      id: "plan-exercise-semantic", patient_id: PATIENT_ID, category: "exercise",
      title_fr: featuredExercise.titleFr, title_en: featuredExercise.titleEn,
      description_fr: featuredExercise.instructionsFr, description_en: featuredExercise.instructionsEn,
      scheduled_at: null, status: "active", source: "curated", created_by_role: "admin", created_by_name: "Équipe Élan",
      evidence_title: featuredExercise.evidenceTitle, evidence_url: featuredExercise.evidenceUrl,
      safety_class: featuredExercise.safetyClass, points: 20, exercise_library_id: featuredExercise.id,
      session_id: null, created_at: now, updated_at: now,
    },
  ];
  return frontendPlanRows;
}

function readFrontendPlan() {
  return {
    entries: getFrontendPlanRows().map(toPlanEntry),
    library: exerciseCatalog,
    sessions: frontendSessionRows.map(toSession),
  };
}

async function readPlan() {
  const [entries, library, sessions] = await Promise.all([
    sqlite.prepare("SELECT * FROM plan_entries WHERE patient_id = ? ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END, COALESCE(scheduled_at, created_at), created_at DESC").bind(PATIENT_ID).all<PlanRow>(),
    sqlite.prepare("SELECT * FROM exercise_library ORDER BY domain, difficulty, duration_minutes, title_fr").all<LibraryRow>(),
    sqlite.prepare("SELECT * FROM plan_sessions WHERE patient_id = ? ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, created_at DESC").bind(PATIENT_ID).all<SessionRow>(),
  ]);
  return { entries: entries.results.map(toPlanEntry), library: library.results.map(toLibraryItem), sessions: sessions.results.map(toSession) };
}

export async function GET(request: Request) {
  try {
    const auth = await requireApiSession(request, ["patient", "family", "admin"]);
    if ("response" in auth) return auth.response;
    if (hasConvex()) {
      await convexMutation<string>("elan:ensureDailySession", {
        patientId: PATIENT_ID,
        date: torontoDate(),
        actorRole: auth.session.role,
        actorName: auth.session.name,
      });
      const plan = await convexQuery<{ entries: unknown[]; sessions: unknown[] }>("elan:getPlan", { patientId: PATIENT_ID });
      return Response.json({ ...plan, library: exerciseCatalog });
    }
    if (usesFrontendData()) return Response.json(readFrontendPlan());
    await ensurePlanWorkspace();
    return Response.json(await readPlan());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load plan" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiSession(request, ["patient", "family", "admin"]);
    if ("response" in auth) return auth.response;
    const payload = await request.json() as Record<string, unknown>;
    const createdByRole = auth.session.role;
    const createdByName = auth.session.name;

    if (hasConvex()) {
      if (payload.kind === "session") {
        const templateIds = [...new Set(Array.isArray(payload.templateIds) ? payload.templateIds.map(String) : [])].slice(0, 8);
        if (!templateIds.length) return Response.json({ error: "Choose at least one exercise" }, { status: 400 });
        const result = await convexMutation<{ session: unknown; entries: unknown[] }>("elan:createSession", {
          patientId: PATIENT_ID,
          templateIds,
          targetDuration: Math.max(5, Math.min(60, Number(payload.targetDuration) || 15)),
          effortLevel: Math.max(1, Math.min(5, Number(payload.effortLevel) || 2)),
          actorRole: createdByRole,
          actorName: createdByName,
        });
        return Response.json(result, { status: 201 });
      }
      const category = String(payload.category ?? "todo");
      const title = String(payload.title ?? "").trim().slice(0, 120);
      const templateId = String(payload.templateId ?? "").trim() || undefined;
      if (!templateId && (!CATEGORIES.has(category) || !title)) {
        return Response.json({ error: "A valid category and title are required" }, { status: 400 });
      }
      const entry = await convexMutation<unknown>("elan:addPlanEntry", {
        patientId: PATIENT_ID,
        templateId,
        category,
        title,
        description: String(payload.description ?? "").trim().slice(0, 800),
        scheduledAt: String(payload.scheduledAt ?? "").trim() || undefined,
        actorRole: createdByRole,
        actorName: createdByName,
      });
      return Response.json({ entry }, { status: 201 });
    }

    if (usesFrontendData()) {
      const now = new Date().toISOString();
      if (payload.kind === "session") {
        const templateIds = [...new Set(Array.isArray(payload.templateIds) ? payload.templateIds.map(String) : [])].slice(0, 8);
        const templates = templateIds.map((id) => exerciseCatalog.find((item) => item.id === id)).filter((item): item is (typeof exerciseCatalog)[number] => Boolean(item));
        if (!templates.length) return Response.json({ error: "Choose at least one exercise" }, { status: 400 });
        const targetDuration = Math.max(5, Math.min(60, Number(payload.targetDuration) || 15));
        const effortLevel = Math.max(1, Math.min(5, Number(payload.effortLevel) || 2));
        const sessionId = `session-${crypto.randomUUID()}`;
        const sessionRow: SessionRow = {
          id: sessionId, patient_id: PATIENT_ID,
          title_fr: `Séance ${frontendSessionRows.length + 1} · ${targetDuration} min`,
          title_en: `Session ${frontendSessionRows.length + 1} · ${targetDuration} min`,
          target_duration: targetDuration, effort_level: effortLevel, status: "active",
          created_by_role: createdByRole, created_by_name: createdByName, created_at: now, updated_at: now,
        };
        const rows: PlanRow[] = templates.map((template) => ({
          id: `plan-${crypto.randomUUID()}`, patient_id: PATIENT_ID, category: "exercise",
          title_fr: template.titleFr, title_en: template.titleEn,
          description_fr: template.instructionsFr, description_en: template.instructionsEn,
          scheduled_at: null, status: "active", source: "curated",
          created_by_role: createdByRole, created_by_name: createdByName,
          evidence_title: template.evidenceTitle, evidence_url: template.evidenceUrl,
          safety_class: template.safetyClass, points: 20, exercise_library_id: template.id,
          session_id: sessionId, created_at: now, updated_at: now,
        }));
        frontendSessionRows.unshift(sessionRow);
        getFrontendPlanRows().unshift(...rows);
        return Response.json({ session: toSession(sessionRow), entries: rows.map(toPlanEntry) }, { status: 201 });
      }

      const templateId = String(payload.templateId ?? "").trim();
      const template = templateId ? exerciseCatalog.find((item) => item.id === templateId) : null;
      const category = template ? "exercise" : String(payload.category ?? "todo");
      const title = template ? template.titleFr : String(payload.title ?? "").trim().slice(0, 120);
      if (!CATEGORIES.has(category) || !title) return Response.json({ error: "A valid category and title are required" }, { status: 400 });
      const row: PlanRow = {
        id: `plan-${crypto.randomUUID()}`, patient_id: PATIENT_ID, category,
        title_fr: title, title_en: template?.titleEn ?? title,
        description_fr: template?.instructionsFr ?? String(payload.description ?? "").trim().slice(0, 800),
        description_en: template?.instructionsEn ?? String(payload.description ?? "").trim().slice(0, 800),
        scheduled_at: String(payload.scheduledAt ?? "").trim() || null, status: "active",
        source: template ? "curated" : "manual", created_by_role: createdByRole, created_by_name: createdByName,
        evidence_title: template?.evidenceTitle ?? null, evidence_url: template?.evidenceUrl ?? null,
        safety_class: template?.safetyClass ?? (category === "exercise" ? "clinical_review" : "standard"),
        points: template ? 20 : 10, exercise_library_id: template?.id ?? null, session_id: null,
        created_at: now, updated_at: now,
      };
      getFrontendPlanRows().unshift(row);
      return Response.json({ entry: toPlanEntry(row) }, { status: 201 });
    }

    await ensurePlanWorkspace();
    if (payload.kind === "session") {
      const templateIds = [...new Set(Array.isArray(payload.templateIds) ? payload.templateIds.map(String) : [])].slice(0, 8);
      const targetDuration = Math.max(5, Math.min(60, Number(payload.targetDuration) || 15));
      const effortLevel = Math.max(1, Math.min(5, Number(payload.effortLevel) || 2));
      if (!templateIds.length) return Response.json({ error: "Choose at least one exercise" }, { status: 400 });
      const placeholders = templateIds.map(() => "?").join(", ");
      const templates = await sqlite.prepare(`SELECT * FROM exercise_library WHERE id IN (${placeholders})`).bind(...templateIds).all<LibraryRow>();
      if (templates.results.length !== templateIds.length) return Response.json({ error: "One or more exercises were not found" }, { status: 404 });

      const sessionId = `session-${crypto.randomUUID()}`;
      const sessionNumber = await sqlite.prepare("SELECT COUNT(*) AS total FROM plan_sessions WHERE patient_id = ?").bind(PATIENT_ID).first<{ total: number }>();
      const sequence = Number(sessionNumber?.total ?? 0) + 1;
      await sqlite.prepare("INSERT INTO plan_sessions (id, patient_id, title_fr, title_en, target_duration, effort_level, status, created_by_role, created_by_name) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)")
        .bind(sessionId, PATIENT_ID, `Séance ${sequence} · ${targetDuration} min`, `Session ${sequence} · ${targetDuration} min`, targetDuration, effortLevel, createdByRole, createdByName).run();
      const entryStatements = templates.results.map((template) => sqlite.prepare("INSERT INTO plan_entries (id, patient_id, category, title_fr, title_en, description_fr, description_en, status, source, created_by_role, created_by_name, evidence_title, evidence_url, safety_class, points, exercise_library_id, session_id) VALUES (?, ?, 'exercise', ?, ?, ?, ?, 'active', 'curated', ?, ?, ?, ?, ?, 20, ?, ?)")
        .bind(`plan-${crypto.randomUUID()}`, PATIENT_ID, template.title_fr, template.title_en, template.instructions_fr, template.instructions_en, createdByRole, createdByName, template.evidence_title, template.evidence_url, template.safety_class, template.id, sessionId));
      await sqlite.batch(entryStatements);
      await sqlite.prepare("INSERT INTO audit_events (patient_id, actor_email, action, resource_type, resource_id, detail) VALUES (?, ?, 'plan_session.created', 'plan_session', ?, ?)")
        .bind(PATIENT_ID, auth.session.email, sessionId, `${templates.results.length} exercises`).run();
      const result = await readPlan();
      return Response.json({ session: result.sessions.find((item) => item.id === sessionId), entries: result.entries.filter((item) => item.sessionId === sessionId) }, { status: 201 });
    }

    const templateId = String(payload.templateId ?? "").trim();
    const id = `plan-${crypto.randomUUID()}`;
    if (templateId) {
      const template = await sqlite.prepare("SELECT * FROM exercise_library WHERE id = ?").bind(templateId).first<LibraryRow>();
      if (!template) return Response.json({ error: "Exercise template not found" }, { status: 404 });
      await sqlite.prepare("INSERT INTO plan_entries (id, patient_id, category, title_fr, title_en, description_fr, description_en, status, source, created_by_role, created_by_name, evidence_title, evidence_url, safety_class, points, exercise_library_id) VALUES (?, ?, 'exercise', ?, ?, ?, ?, 'active', 'curated', ?, ?, ?, ?, ?, 20, ?)")
        .bind(id, PATIENT_ID, template.title_fr, template.title_en, template.instructions_fr, template.instructions_en, createdByRole, createdByName, template.evidence_title, template.evidence_url, template.safety_class, template.id).run();
    } else {
      const category = String(payload.category ?? "todo");
      const title = String(payload.title ?? "").trim().slice(0, 120);
      const description = String(payload.description ?? "").trim().slice(0, 800);
      const scheduledAt = String(payload.scheduledAt ?? "").trim() || null;
      if (!CATEGORIES.has(category) || !title) return Response.json({ error: "A valid category and title are required" }, { status: 400 });
      const safetyClass = category === "exercise" ? "clinical_review" : "standard";
      await sqlite.prepare("INSERT INTO plan_entries (id, patient_id, category, title_fr, title_en, description_fr, description_en, scheduled_at, status, source, created_by_role, created_by_name, safety_class, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 'manual', ?, ?, ?, 10)")
        .bind(id, PATIENT_ID, category, title, title, description, description, scheduledAt, createdByRole, createdByName, safetyClass).run();
    }

    await sqlite.prepare("INSERT INTO audit_events (patient_id, actor_email, action, resource_type, resource_id, detail) VALUES (?, ?, 'plan_entry.created', 'plan_entry', ?, ?)")
      .bind(PATIENT_ID, auth.session.email, id, templateId ? `curated:${templateId}` : "manual").run();
    const row = await sqlite.prepare("SELECT * FROM plan_entries WHERE id = ?").bind(id).first<PlanRow>();
    return Response.json({ entry: row ? toPlanEntry(row) : null }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to add plan entry" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireApiSession(request, ["patient", "family", "admin"]);
    if ("response" in auth) return auth.response;
    const payload = await request.json() as Record<string, unknown>;
    const id = String(payload.id ?? "");
    const status = String(payload.status ?? "");
    if (!id || !["active", "completed", "paused"].includes(status)) {
      return Response.json({ error: "Invalid plan update" }, { status: 400 });
    }
    if (hasConvex()) {
      const entry = await convexMutation<unknown>("elan:updatePlanEntry", {
        patientId: PATIENT_ID,
        id,
        status,
      });
      return Response.json({ entry });
    }
    if (usesFrontendData()) {
      const row = getFrontendPlanRows().find((item) => item.id === id);
      if (!row) return Response.json({ error: "Plan entry not found" }, { status: 404 });
      row.status = status;
      row.updated_at = new Date().toISOString();
      if (row.session_id) {
        const session = frontendSessionRows.find((item) => item.id === row.session_id);
        if (session) {
          session.status = getFrontendPlanRows().filter((item) => item.session_id === row.session_id).every((item) => item.status === "completed") ? "completed" : "active";
          session.updated_at = row.updated_at;
        }
      }
      return Response.json({ entry: toPlanEntry(row) });
    }
    await ensurePlanWorkspace();
    const existing = await sqlite.prepare("SELECT * FROM plan_entries WHERE id = ? AND patient_id = ?").bind(id, PATIENT_ID).first<PlanRow>();
    if (!existing) return Response.json({ error: "Plan entry not found" }, { status: 404 });
    await sqlite.prepare("UPDATE plan_entries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND patient_id = ?").bind(status, id, PATIENT_ID).run();
    if (existing.session_id) {
      const remaining = await sqlite.prepare("SELECT COUNT(*) AS total FROM plan_entries WHERE session_id = ? AND status != 'completed'").bind(existing.session_id).first<{ total: number }>();
      await sqlite.prepare("UPDATE plan_sessions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(Number(remaining?.total ?? 0) === 0 ? "completed" : "active", existing.session_id).run();
    }
    await sqlite.prepare("INSERT INTO audit_events (patient_id, actor_email, action, resource_type, resource_id, detail) VALUES (?, ?, 'plan_entry.status_changed', 'plan_entry', ?, ?)")
      .bind(PATIENT_ID, auth.session.email, id, status).run();
    const row = await sqlite.prepare("SELECT * FROM plan_entries WHERE id = ?").bind(id).first<PlanRow>();
    return Response.json({ entry: row ? toPlanEntry(row) : null });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update plan" }, { status: 500 });
  }
}
