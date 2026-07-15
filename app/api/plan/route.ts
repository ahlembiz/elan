import { env } from "cloudflare:workers";
import { ensureProductWorkspace } from "../product/route";

const PATIENT_ID = "patient-salah";
const CATEGORIES = new Set(["appointment", "todo", "diet", "exercise"]);
const ACTOR_ROLES = new Set(["patient", "admin"]);

type PlanRow = {
  id: string;
  patient_id: string;
  category: string;
  title_fr: string;
  title_en: string;
  description_fr: string;
  description_en: string;
  scheduled_at: string | null;
  status: string;
  source: string;
  created_by_role: string;
  created_by_name: string;
  evidence_title: string | null;
  evidence_url: string | null;
  safety_class: string;
  points: number;
  exercise_library_id: string | null;
  created_at: string;
  updated_at: string;
};

type LibraryRow = {
  id: string;
  domain: string;
  title_fr: string;
  title_en: string;
  summary_fr: string;
  summary_en: string;
  instructions_fr: string;
  instructions_en: string;
  assistance_fr: string;
  assistance_en: string;
  evidence_title: string;
  evidence_url: string;
  safety_class: string;
  review_required: number;
  difficulty: number;
};

const librarySeeds = [
  {
    id: "lib-semantic-features", domain: "communication", difficulty: 2, safety: "standard",
    titleFr: "Carte des caractéristiques du mot", titleEn: "Semantic feature map",
    summaryFr: "Retrouver un mot personnel en explorant sa catégorie, son usage, son apparence et son contexte.", summaryEn: "Retrieve a personal word by exploring its category, use, appearance, and context.",
    instructionsFr: "Choisissez un mot utile avec l’orthophoniste. Décrivez ce qui l’entoure, puis utilisez le niveau d’indice prévu au plan.", instructionsEn: "Choose a useful word with the speech-language pathologist. Describe what surrounds it, then use the cue level in the plan.",
    assistanceFr: "Indices gradués configurés par l’orthophoniste", assistanceEn: "Graded cues configured by the speech-language pathologist",
    evidenceTitle: "Systematic review of Semantic Feature Analysis therapy studies for aphasia", evidenceUrl: "https://pubmed.ncbi.nlm.nih.gov/29710193/",
  },
  {
    id: "lib-personal-script", domain: "communication", difficulty: 2, safety: "standard",
    titleFr: "Script personnel — rendez-vous", titleEn: "Personal script — appointment",
    summaryFr: "Répéter une courte conversation qui compte réellement dans la vie quotidienne.", summaryEn: "Rehearse a short conversation that matters in daily life.",
    instructionsFr: "Pratiquez le script personnalisé validé avec votre orthophoniste. Parlez, lisez ou pointez; réduisez les indices seulement selon le plan.", instructionsEn: "Practise the personalized script approved with your speech-language pathologist. Speak, read, or point; reduce cues only as planned.",
    assistanceFr: "Modèle audio ou écrit selon le plan", assistanceEn: "Audio or written model as planned",
    evidenceTitle: "Acquisition and maintenance of scripts in aphasia: randomized crossover study", evidenceUrl: "https://pubmed.ncbi.nlm.nih.gov/24686911/",
  },
  {
    id: "lib-supported-conversation", domain: "communication", difficulty: 1, safety: "standard",
    titleFr: "Conversation soutenue — réparer le message", titleEn: "Supported conversation — repair the message",
    summaryFr: "S’entraîner avec un proche à ralentir, confirmer et utiliser l’écriture ou le geste lorsque le message bloque.", summaryEn: "Practise with a partner to slow down, confirm, and use writing or gesture when a message breaks down.",
    instructionsFr: "Le partenaire pose une idée à la fois, offre des choix et confirme le message compris sans corriger la personne.", instructionsEn: "The partner presents one idea at a time, offers choices, and confirms the understood message without correcting the person.",
    assistanceFr: "Partenaire formé ou guidé", assistanceEn: "Trained or guided partner",
    evidenceTitle: "Canadian Stroke Best Practices — Language and Communication", evidenceUrl: "https://www.strokebestpractices.ca/recommendations/stroke-rehabilitation-delivery/7-language-and-communication",
  },
  {
    id: "lib-functional-reading", domain: "communication", difficulty: 2, safety: "standard",
    titleFr: "Lecture fonctionnelle — carte de rendez-vous", titleEn: "Functional reading — appointment card",
    summaryFr: "Repérer l’heure, le lieu et la personne-ressource dans un document réellement utilisé.", summaryEn: "Find the time, place, and contact in a document that is actually used.",
    instructionsFr: "Utilisez une vraie carte de rendez-vous simplifiée. Repérez une information à la fois avec l’aide visuelle prévue.", instructionsEn: "Use a simplified real appointment card. Find one piece of information at a time with the planned visual support.",
    assistanceFr: "Document aphasie-friendly et indices visuels", assistanceEn: "Aphasia-friendly document and visual cues",
    evidenceTitle: "Canadian Stroke Best Practices — Language and Communication", evidenceUrl: "https://www.strokebestpractices.ca/recommendations/stroke-rehabilitation-delivery/7-language-and-communication",
  },
  {
    id: "lib-seated-trunk", domain: "mobility", difficulty: 1, safety: "supervised",
    titleFr: "Contrôle du tronc en position assise", titleEn: "Seated trunk control",
    summaryFr: "Déplacer doucement le poids dans les limites choisies par la physiothérapeute.", summaryEn: "Gently shift weight within limits chosen by the physiotherapist.",
    instructionsFr: "Utilisez seulement la chaise, la direction, l’amplitude et le soutien inscrits au plan. Arrêtez en cas de douleur, étourdissement ou perte d’équilibre.", instructionsEn: "Use only the chair, direction, range, and support written in the plan. Stop for pain, dizziness, or loss of balance.",
    assistanceFr: "Supervision selon le plan de mobilité", assistanceEn: "Supervision according to the mobility plan",
    evidenceTitle: "Canadian Stroke Best Practices — Lower Extremity, Balance, Mobility and Aerobic Training", evidenceUrl: "https://www.strokebestpractices.ca/recommendations/stroke-rehabilitation-delivery/4-lower-extremity-balance-mobility-and-aerobic-training",
  },
  {
    id: "lib-sit-to-stand", domain: "mobility", difficulty: 2, safety: "supervised",
    titleFr: "Se lever d’une chaise — tâche répétée", titleEn: "Sit-to-stand — repeated task",
    summaryFr: "Pratiquer un transfert fonctionnel avec la chaise, l’assistance et la dose déjà approuvées.", summaryEn: "Practise a functional transfer using the already approved chair, assistance, and dose.",
    instructionsFr: "Pieds et mains selon votre plan. L’accompagnateur reste à la position indiquée. Ne changez ni la hauteur de chaise ni le nombre de répétitions.", instructionsEn: "Place feet and hands as written in your plan. The helper stays in the assigned position. Do not change chair height or repetitions.",
    assistanceFr: "Quelqu’un à proximité — exigence protégée", assistanceEn: "Someone nearby — protected requirement",
    evidenceTitle: "Interventions for improving sit-to-stand ability following stroke", evidenceUrl: "https://pubmed.ncbi.nlm.nih.gov/24859467/",
  },
  {
    id: "lib-seated-reach", domain: "mobility", difficulty: 2, safety: "supervised",
    titleFr: "Atteinte fonctionnelle en position assise", titleEn: "Functional reaching in sitting",
    summaryFr: "Atteindre un objet utile dans une direction et une distance choisies par la physiothérapeute.", summaryEn: "Reach for a useful object at a direction and distance chosen by the physiotherapist.",
    instructionsFr: "Utilisez la surface, l’objet et le soutien prévus. Aucun objet lourd, chaud ou cassable. Arrêtez si le contrôle du tronc diminue.", instructionsEn: "Use the planned surface, object, and support. No heavy, hot, or breakable objects. Stop if trunk control decreases.",
    assistanceFr: "Supervision et installation approuvée", assistanceEn: "Approved setup and supervision",
    evidenceTitle: "Canadian Stroke Best Practices — task-specific, goal-oriented rehabilitation", evidenceUrl: "https://www.strokebestpractices.ca/recommendations/stroke-rehabilitation-delivery/4-lower-extremity-balance-mobility-and-aerobic-training",
  },
  {
    id: "lib-step-initiation", domain: "mobility", difficulty: 3, safety: "clinical_review",
    titleFr: "Initiation du pas avec appui", titleEn: "Supported step initiation",
    summaryFr: "Préparer le premier pas à côté d’un appui stable, uniquement après configuration clinique.", summaryEn: "Prepare the first step beside stable support, only after clinical configuration.",
    instructionsFr: "Modèle réservé à l’équipe: préciser l’appui, le côté, l’assistance et la dose avant publication dans le plan du patient.", instructionsEn: "Team-only template: specify support, side, assistance, and dose before publishing it to the patient plan.",
    assistanceFr: "Validation et présence de la physiothérapeute requises", assistanceEn: "Physiotherapist approval and presence required",
    evidenceTitle: "Repetitive task training for improving functional ability after stroke", evidenceUrl: "https://pubmed.ncbi.nlm.nih.gov/27841442/",
  },
] as const;

let planWorkspacePromise: Promise<void> | null = null;

async function initializePlanWorkspace() {
  await ensureProductWorkspace();
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS exercise_library (id TEXT PRIMARY KEY NOT NULL, domain TEXT NOT NULL, title_fr TEXT NOT NULL, title_en TEXT NOT NULL, summary_fr TEXT NOT NULL, summary_en TEXT NOT NULL, instructions_fr TEXT NOT NULL, instructions_en TEXT NOT NULL, assistance_fr TEXT NOT NULL, assistance_en TEXT NOT NULL, evidence_title TEXT NOT NULL, evidence_url TEXT NOT NULL, safety_class TEXT NOT NULL, review_required INTEGER DEFAULT true NOT NULL, difficulty INTEGER DEFAULT 1 NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS plan_entries (id TEXT PRIMARY KEY NOT NULL, patient_id TEXT NOT NULL, category TEXT NOT NULL, title_fr TEXT NOT NULL, title_en TEXT NOT NULL, description_fr TEXT DEFAULT '' NOT NULL, description_en TEXT DEFAULT '' NOT NULL, scheduled_at TEXT, status TEXT DEFAULT 'active' NOT NULL, source TEXT DEFAULT 'manual' NOT NULL, created_by_role TEXT NOT NULL, created_by_name TEXT NOT NULL, evidence_title TEXT, evidence_url TEXT, safety_class TEXT DEFAULT 'standard' NOT NULL, points INTEGER DEFAULT 10 NOT NULL, exercise_library_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (patient_id) REFERENCES patient_profiles(id), FOREIGN KEY (exercise_library_id) REFERENCES exercise_library(id))"),
  ]);

  const libraryStatements = librarySeeds.map((item) => env.DB.prepare("INSERT OR IGNORE INTO exercise_library (id, domain, title_fr, title_en, summary_fr, summary_en, instructions_fr, instructions_en, assistance_fr, assistance_en, evidence_title, evidence_url, safety_class, review_required, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(item.id, item.domain, item.titleFr, item.titleEn, item.summaryFr, item.summaryEn, item.instructionsFr, item.instructionsEn, item.assistanceFr, item.assistanceEn, item.evidenceTitle, item.evidenceUrl, item.safety, 1, item.difficulty));

  const planStatements = [
    env.DB.prepare("INSERT OR IGNORE INTO plan_entries (id, patient_id, category, title_fr, title_en, description_fr, description_en, scheduled_at, source, created_by_role, created_by_name, safety_class, points) VALUES (?, ?, 'appointment', ?, ?, ?, ?, ?, 'curated', 'admin', 'Équipe Élan', 'standard', 20)").bind("plan-appointment-slp", PATIENT_ID, "Orthophonie — Marie-Claude", "Speech therapy — Marie-Claude", "Préparer les trois phrases personnelles à réviser.", "Prepare the three personal phrases to review.", "2026-07-16T10:30:00-04:00"),
    env.DB.prepare("INSERT OR IGNORE INTO plan_entries (id, patient_id, category, title_fr, title_en, description_fr, description_en, scheduled_at, source, created_by_role, created_by_name, safety_class, points) VALUES (?, ?, 'todo', ?, ?, ?, ?, ?, 'curated', 'admin', 'Équipe Élan', 'standard', 10)").bind("plan-todo-questions", PATIENT_ID, "Choisir 3 questions pour le rendez-vous", "Choose 3 questions for the appointment", "Écrire, enregistrer ou montrer les questions — toutes les formes sont valides.", "Write, record, or point to the questions — every form is valid.", "2026-07-15T18:00:00-04:00"),
    env.DB.prepare("INSERT OR IGNORE INTO plan_entries (id, patient_id, category, title_fr, title_en, description_fr, description_en, source, created_by_role, created_by_name, evidence_title, evidence_url, safety_class, points) VALUES (?, ?, 'diet', ?, ?, ?, ?, 'curated', 'admin', 'Équipe Élan', ?, ?, 'standard', 10)").bind("plan-diet-balanced", PATIENT_ID, "Repère d’assiette cœur-santé", "Heart-healthy plate cue", "Prévoir légumes ou fruits, grains entiers et une source de protéines peu transformée selon votre plan alimentaire. Les textures et liquides restent exactement ceux prescrits par votre équipe.", "Plan vegetables or fruit, whole grains, and a minimally processed protein source according to your food plan. Keep textures and fluids exactly as prescribed by your team.", "Canadian Stroke Best Practices — Healthy Balanced Diet", "https://www.strokebestpractices.ca/recommendations/secondary-prevention-of-stroke/lifestyle-behaviours-and-risk-factor-management"),
    env.DB.prepare("INSERT OR IGNORE INTO plan_entries (id, patient_id, category, title_fr, title_en, description_fr, description_en, source, created_by_role, created_by_name, evidence_title, evidence_url, safety_class, points, exercise_library_id) SELECT ?, ?, 'exercise', title_fr, title_en, instructions_fr, instructions_en, 'curated', 'admin', 'Équipe Élan', evidence_title, evidence_url, safety_class, 20, id FROM exercise_library WHERE id = ?").bind("plan-exercise-semantic", PATIENT_ID, "lib-semantic-features"),
  ];
  await env.DB.batch([...libraryStatements, ...planStatements]);
}

function ensurePlanWorkspace() {
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
    exerciseLibraryId: row.exercise_library_id, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function toLibraryItem(row: LibraryRow) {
  return {
    id: row.id, domain: row.domain, titleFr: row.title_fr, titleEn: row.title_en,
    summaryFr: row.summary_fr, summaryEn: row.summary_en,
    instructionsFr: row.instructions_fr, instructionsEn: row.instructions_en,
    assistanceFr: row.assistance_fr, assistanceEn: row.assistance_en,
    evidenceTitle: row.evidence_title, evidenceUrl: row.evidence_url,
    safetyClass: row.safety_class, reviewRequired: Boolean(row.review_required), difficulty: row.difficulty,
  };
}

async function readPlan() {
  const entries = await env.DB.prepare("SELECT * FROM plan_entries WHERE patient_id = ? ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END, COALESCE(scheduled_at, created_at), created_at DESC").bind(PATIENT_ID).all<PlanRow>();
  const library = await env.DB.prepare("SELECT * FROM exercise_library ORDER BY domain, difficulty, title_fr").all<LibraryRow>();
  return { entries: entries.results.map(toPlanEntry), library: library.results.map(toLibraryItem) };
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
    const createdByName = createdByRole === "admin" ? "Équipe Élan" : "Salah";
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
      .bind(PATIENT_ID, createdByRole === "admin" ? "admin@elan.local" : "salah@elan.local", id, templateId ? `curated:${templateId}` : "manual").run();
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
    await env.DB.prepare("UPDATE plan_entries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND patient_id = ?").bind(status, id, PATIENT_ID).run();
    await env.DB.prepare("INSERT INTO audit_events (patient_id, actor_email, action, resource_type, resource_id, detail) VALUES (?, ?, 'plan_entry.status_changed', 'plan_entry', ?, ?)")
      .bind(PATIENT_ID, createdByRole === "admin" ? "admin@elan.local" : "salah@elan.local", id, status).run();
    const row = await env.DB.prepare("SELECT * FROM plan_entries WHERE id = ?").bind(id).first<PlanRow>();
    return Response.json({ entry: row ? toPlanEntry(row) : null });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update plan" }, { status: 500 });
  }
}
