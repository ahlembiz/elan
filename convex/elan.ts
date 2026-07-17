import { v } from "convex/values";
import { exerciseCatalog } from "../app/api/plan/exerciseCatalog";
import { mutation, query, type MutationCtx } from "./_generated/server";

const actorRole = v.union(v.literal("patient"), v.literal("family"), v.literal("admin"));
const planStatus = v.union(v.literal("active"), v.literal("completed"), v.literal("paused"));
const planCategory = v.union(v.literal("appointment"), v.literal("todo"), v.literal("diet"), v.literal("exercise"));

function requireServerSecret(secret: string) {
  const configured = process.env.ELAN_CONVEX_API_SECRET;
  if (!configured || secret !== configured) throw new Error("Convex access denied");
}

function withoutSystemFields<T extends { _id: unknown; _creationTime: number }>(document: T) {
  return Object.fromEntries(
    Object.entries(document).filter(([key]) => key !== "_id" && key !== "_creationTime"),
  ) as Omit<T, "_id" | "_creationTime">;
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function dailyExercises(patientId: string, date: string, sequence = 1) {
  const seed = stableHash(`${patientId}:${date}`);
  const rotation = Math.max(0, sequence - 1);
  // Daily sessions are done solo and must always stay at 30 minutes or less (3 × ≤10 min).
  const communication = exerciseCatalog.filter((item) => item.domain === "communication" && !item.requiresPartner && item.durationMinutes <= 10);
  const mobility = exerciseCatalog.filter((item) => item.domain === "mobility" && !item.requiresPartner && item.durationMinutes <= 10);
  const firstCommunication = communication[(seed + rotation) % communication.length];
  const selectedMobility = mobility[(Math.floor(seed / 7) + rotation) % mobility.length];
  let secondCommunication = communication[(Math.floor(seed / 17 + 11) + rotation * 3) % communication.length];
  if (secondCommunication.id === firstCommunication.id) {
    secondCommunication = communication[(communication.indexOf(secondCommunication) + 1) % communication.length];
  }
  return seed % 2 === 0
    ? [firstCommunication, selectedMobility, secondCommunication]
    : [selectedMobility, firstCommunication, secondCommunication];
}

async function createDailySession(
  ctx: MutationCtx,
  args: {
    patientId: string;
    date: string;
    actorRole: "patient" | "family" | "admin";
    actorName: string;
  },
  sequence: number,
) {
  const exercises = dailyExercises(args.patientId, args.date, sequence);
  const now = new Date().toISOString();
  const sessionId = sequence === 1
    ? `daily-${args.patientId}-${args.date}`
    : `daily-${args.patientId}-${args.date}-${sequence}`;
  const targetDuration = exercises.reduce((total, exercise) => total + exercise.durationMinutes, 0);
  const effortLevel = Math.max(...exercises.map((exercise) => exercise.effortLevel));
  const session = {
    id: sessionId,
    patientId: args.patientId,
    kind: "daily" as const,
    sessionDate: args.date,
    titleFr: `Séance ${sequence} du jour · ${targetDuration} min`,
    titleEn: `Today’s session ${sequence} · ${targetDuration} min`,
    targetDuration,
    effortLevel,
    status: "active" as const,
    createdByRole: args.actorRole,
    createdByName: args.actorName,
    createdAt: now,
    updatedAt: now,
  };
  await ctx.db.insert("planSessions", session);
  const entries = [];
  for (const exercise of exercises) {
    const entry = {
      id: `${sessionId}-${exercise.id}`,
      patientId: args.patientId,
      category: "exercise" as const,
      titleFr: exercise.titleFr,
      titleEn: exercise.titleEn,
      descriptionFr: exercise.instructionsFr,
      descriptionEn: exercise.instructionsEn,
      scheduledAt: args.date,
      status: "active" as const,
      source: "curated" as const,
      createdByRole: args.actorRole,
      createdByName: args.actorName,
      evidenceTitle: exercise.evidenceTitle,
      evidenceUrl: exercise.evidenceUrl,
      safetyClass: exercise.safetyClass,
      points: 20,
      exerciseLibraryId: exercise.id,
      sessionId,
      createdAt: now,
      updatedAt: now,
    };
    await ctx.db.insert("planEntries", entry);
    entries.push(entry);
  }
  return { session, entries };
}

async function ensureBasePlan(ctx: MutationCtx, patientId: string, date: string) {
  const now = new Date().toISOString();
  const seeds = [
    {
      id: "plan-appointment-slp", category: "appointment" as const,
      titleFr: "Orthophonie — Marie-Claude", titleEn: "Speech therapy — Marie-Claude",
      descriptionFr: "Préparer les trois phrases personnelles à réviser.", descriptionEn: "Prepare the three personal phrases to review.",
      scheduledAt: `${date}T10:30:00`, points: 20,
    },
    {
      id: "plan-todo-questions", category: "todo" as const,
      titleFr: "Choisir 3 questions pour le rendez-vous", titleEn: "Choose 3 questions for the appointment",
      descriptionFr: "Écrire, enregistrer ou montrer les questions — toutes les formes sont valides.",
      descriptionEn: "Write, record, or point to the questions—every form is valid.",
      scheduledAt: `${date}T18:00:00`, points: 10,
    },
    {
      id: "plan-diet-balanced", category: "diet" as const,
      titleFr: "Repère d’assiette cœur-santé", titleEn: "Heart-healthy plate cue",
      descriptionFr: "Prévoir légumes ou fruits, grains entiers et une source de protéines selon le plan alimentaire.",
      descriptionEn: "Plan vegetables or fruit, whole grains, and a protein source according to the food plan.",
      points: 10,
      evidenceTitle: "Canadian Stroke Best Practices — Healthy Balanced Diet",
      evidenceUrl: "https://www.strokebestpractices.ca/recommendations/secondary-prevention-of-stroke/lifestyle-behaviours-and-risk-factor-management",
    },
  ];

  for (const seed of seeds) {
    const existing = await ctx.db.query("planEntries")
      .withIndex("by_patient_external", (q) => q.eq("patientId", patientId).eq("id", seed.id))
      .unique();
    if (!existing) {
      await ctx.db.insert("planEntries", {
        ...seed,
        patientId,
        status: "active",
        source: "curated",
        createdByRole: "admin",
        createdByName: "Équipe Élan",
        safetyClass: "standard",
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}

export const ensureDailySession = mutation({
  args: {
    secret: v.string(),
    patientId: v.string(),
    date: v.string(),
    actorRole,
    actorName: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    await ensureBasePlan(ctx, args.patientId, args.date);
    const sessionsForDate = await ctx.db.query("planSessions")
      .withIndex("by_patient_date", (q) => q.eq("patientId", args.patientId).eq("sessionDate", args.date))
      .collect();
    const active = sessionsForDate
      .filter((session) => session.kind === "daily" && session.status !== "completed")
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
    if (active) return active.id;

    const dailyCount = sessionsForDate.filter((session) => session.kind === "daily").length;
    const replacement = await createDailySession(ctx, args, dailyCount + 1);
    return replacement.session.id;
  },
});

export const removeDailySession = mutation({
  args: { secret: v.string(), patientId: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const sessions = await ctx.db.query("planSessions")
      .withIndex("by_patient_date", (q) => q.eq("patientId", args.patientId).eq("sessionDate", args.date))
      .collect();
    const dailySessions = sessions.filter((session) => session.kind === "daily");
    if (!dailySessions.length) return false;
    for (const session of dailySessions) {
      const entries = await ctx.db.query("planEntries")
        .withIndex("by_patient_session", (q) => q.eq("patientId", args.patientId).eq("sessionId", session.id))
        .collect();
      for (const entry of entries) await ctx.db.delete(entry._id);
      await ctx.db.delete(session._id);
    }
    return true;
  },
});

export const completeSession = mutation({
  args: {
    secret: v.string(),
    patientId: v.string(),
    sessionId: v.string(),
    date: v.string(),
    replaceDaily: v.boolean(),
    actorRole,
    actorName: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const session = await ctx.db.query("planSessions")
      .withIndex("by_patient_external", (q) => q.eq("patientId", args.patientId).eq("id", args.sessionId))
      .unique();
    if (!session) throw new Error("Plan session not found");

    const updatedAt = new Date().toISOString();
    const entries = await ctx.db.query("planEntries")
      .withIndex("by_patient_session", (q) => q.eq("patientId", args.patientId).eq("sessionId", session.id))
      .collect();
    for (const entry of entries) {
      if (entry.status !== "completed") await ctx.db.patch(entry._id, { status: "completed", updatedAt });
    }
    await ctx.db.patch(session._id, { status: "completed", updatedAt });

    if (!args.replaceDaily || session.kind !== "daily") {
      return { completedSessionId: session.id, replacement: null };
    }

    const sessionsForDate = await ctx.db.query("planSessions")
      .withIndex("by_patient_date", (q) => q.eq("patientId", args.patientId).eq("sessionDate", args.date))
      .collect();
    const existingActive = sessionsForDate
      .filter((item) => item.kind === "daily" && item.status !== "completed" && item.id !== session.id)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
    if (existingActive) {
      const replacementEntries = await ctx.db.query("planEntries")
        .withIndex("by_patient_session", (q) => q.eq("patientId", args.patientId).eq("sessionId", existingActive.id))
        .collect();
      return {
        completedSessionId: session.id,
        replacement: {
          session: withoutSystemFields(existingActive),
          entries: replacementEntries.map(withoutSystemFields),
        },
      };
    }

    const dailyCount = sessionsForDate.filter((item) => item.kind === "daily").length;
    const replacement = await createDailySession(ctx, {
      patientId: args.patientId,
      date: args.date,
      actorRole: args.actorRole,
      actorName: args.actorName,
    }, dailyCount + 1);
    return { completedSessionId: session.id, replacement };
  },
});

export const getPlan = query({
  args: { secret: v.string(), patientId: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const entries = await ctx.db.query("planEntries").withIndex("by_patient", (q) => q.eq("patientId", args.patientId)).collect();
    const sessions = await ctx.db.query("planSessions").withIndex("by_patient", (q) => q.eq("patientId", args.patientId)).collect();
    const statusOrder = { active: 0, paused: 1, completed: 2 };
    return {
      entries: entries
        .sort((left, right) => statusOrder[left.status] - statusOrder[right.status] || (left.scheduledAt ?? left.createdAt).localeCompare(right.scheduledAt ?? right.createdAt))
        .map((document) => {
          const entry = withoutSystemFields(document);
          return {
          ...entry,
          scheduledAt: entry.scheduledAt ?? null,
          evidenceTitle: entry.evidenceTitle ?? null,
          evidenceUrl: entry.evidenceUrl ?? null,
          exerciseLibraryId: entry.exerciseLibraryId ?? null,
          sessionId: entry.sessionId ?? null,
          };
        }),
      sessions: sessions
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map(withoutSystemFields),
    };
  },
});

export const createSession = mutation({
  args: {
    secret: v.string(),
    patientId: v.string(),
    templateIds: v.array(v.string()),
    targetDuration: v.number(),
    effortLevel: v.number(),
    actorRole,
    actorName: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const templates = args.templateIds
      .map((id) => exerciseCatalog.find((item) => item.id === id))
      .filter((item): item is (typeof exerciseCatalog)[number] => Boolean(item));
    if (!templates.length) throw new Error("Choose at least one exercise");
    const now = new Date().toISOString();
    const sessionId = `session-${crypto.randomUUID()}`;
    const total = await ctx.db.query("planSessions").withIndex("by_patient", (q) => q.eq("patientId", args.patientId)).collect();
    const session = {
      id: sessionId, patientId: args.patientId, kind: "custom" as const,
      titleFr: `Séance ${total.length + 1} · ${args.targetDuration} min`,
      titleEn: `Session ${total.length + 1} · ${args.targetDuration} min`,
      targetDuration: args.targetDuration, effortLevel: args.effortLevel, status: "active" as const,
      createdByRole: args.actorRole, createdByName: args.actorName, createdAt: now, updatedAt: now,
    };
    await ctx.db.insert("planSessions", session);
    const entries = [];
    for (const template of templates) {
      const entry = {
        id: `plan-${crypto.randomUUID()}`, patientId: args.patientId, category: "exercise" as const,
        titleFr: template.titleFr, titleEn: template.titleEn,
        descriptionFr: template.instructionsFr, descriptionEn: template.instructionsEn,
        status: "active" as const, source: "curated" as const,
        createdByRole: args.actorRole, createdByName: args.actorName,
        evidenceTitle: template.evidenceTitle, evidenceUrl: template.evidenceUrl,
        safetyClass: template.safetyClass, points: 20, exerciseLibraryId: template.id,
        sessionId, createdAt: now, updatedAt: now,
      };
      await ctx.db.insert("planEntries", entry);
      entries.push({ ...entry, scheduledAt: null });
    }
    return { session, entries };
  },
});

export const addPlanEntry = mutation({
  args: {
    secret: v.string(),
    patientId: v.string(),
    templateId: v.optional(v.string()),
    category: v.optional(planCategory),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    scheduledAt: v.optional(v.string()),
    actorRole,
    actorName: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const template = args.templateId ? exerciseCatalog.find((item) => item.id === args.templateId) : undefined;
    const category = template ? "exercise" : args.category;
    const title = template?.titleFr ?? args.title?.trim();
    if (!category || !title) throw new Error("A valid category and title are required");
    const now = new Date().toISOString();
    const entry = {
      id: `plan-${crypto.randomUUID()}`, patientId: args.patientId, category,
      titleFr: title, titleEn: template?.titleEn ?? title,
      descriptionFr: template?.instructionsFr ?? args.description ?? "",
      descriptionEn: template?.instructionsEn ?? args.description ?? "",
      ...(args.scheduledAt ? { scheduledAt: args.scheduledAt } : {}),
      status: "active" as const, source: template ? "curated" as const : "manual" as const,
      createdByRole: args.actorRole, createdByName: args.actorName,
      ...(template ? { evidenceTitle: template.evidenceTitle, evidenceUrl: template.evidenceUrl, exerciseLibraryId: template.id } : {}),
      safetyClass: template?.safetyClass ?? (category === "exercise" ? "clinical_review" as const : "standard" as const),
      points: template ? 20 : 10, createdAt: now, updatedAt: now,
    };
    await ctx.db.insert("planEntries", entry);
    return {
      ...entry,
      scheduledAt: args.scheduledAt ?? null,
      evidenceTitle: template?.evidenceTitle ?? null,
      evidenceUrl: template?.evidenceUrl ?? null,
      exerciseLibraryId: template?.id ?? null,
      sessionId: null,
    };
  },
});

export const updatePlanEntry = mutation({
  args: { secret: v.string(), patientId: v.string(), id: v.string(), status: planStatus },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const entry = await ctx.db.query("planEntries")
      .withIndex("by_patient_external", (q) => q.eq("patientId", args.patientId).eq("id", args.id))
      .unique();
    if (!entry) throw new Error("Plan entry not found");
    const updatedAt = new Date().toISOString();
    await ctx.db.patch(entry._id, { status: args.status, updatedAt });
    if (entry.sessionId) {
      const session = await ctx.db.query("planSessions")
        .withIndex("by_patient_external", (q) => q.eq("patientId", args.patientId).eq("id", entry.sessionId as string))
        .unique();
      const siblings = await ctx.db.query("planEntries")
        .withIndex("by_patient_session", (q) => q.eq("patientId", args.patientId).eq("sessionId", entry.sessionId))
        .collect();
      if (session) {
        const completed = siblings.every((sibling) => sibling.id === entry.id ? args.status === "completed" : sibling.status === "completed");
        await ctx.db.patch(session._id, { status: completed ? "completed" : "active", updatedAt });
      }
    }
    const cleanEntry = withoutSystemFields(entry);
    return {
      ...cleanEntry,
      status: args.status,
      updatedAt,
      scheduledAt: entry.scheduledAt ?? null,
      evidenceTitle: entry.evidenceTitle ?? null,
      evidenceUrl: entry.evidenceUrl ?? null,
      exerciseLibraryId: entry.exerciseLibraryId ?? null,
      sessionId: entry.sessionId ?? null,
    };
  },
});

export const getActivity = query({
  args: { secret: v.string(), patientId: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const [attempts, observations, consents] = await Promise.all([
      ctx.db.query("attempts").withIndex("by_patient", (q) => q.eq("patientId", args.patientId)).collect(),
      ctx.db.query("observations").withIndex("by_patient", (q) => q.eq("patientId", args.patientId)).collect(),
      ctx.db.query("consents").withIndex("by_patient", (q) => q.eq("patientId", args.patientId)).collect(),
    ]);
    return {
      attempts: attempts.sort((left, right) => right.completedAt.localeCompare(left.completedAt)).slice(0, 50).map(withoutSystemFields),
      observations: observations.sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 50).map(withoutSystemFields),
      consents: consents.map(withoutSystemFields),
    };
  },
});

export const recordAttempt = mutation({
  args: {
    secret: v.string(), patientId: v.string(), assignmentId: v.string(),
    supportLevel: v.number(), effort: v.number(), confidence: v.number(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const attempt = {
      id: crypto.randomUUID(), patientId: args.patientId, assignmentId: args.assignmentId,
      supportLevel: args.supportLevel, effort: args.effort, confidence: args.confidence,
      completedAt: new Date().toISOString(),
    };
    await ctx.db.insert("attempts", attempt);
    return attempt;
  },
});

export const addObservation = mutation({
  args: {
    secret: v.string(), patientId: v.string(), authorName: v.string(),
    authorRole: actorRole, category: v.string(), note: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const observation = {
      id: crypto.randomUUID(), patientId: args.patientId, authorName: args.authorName,
      authorRole: args.authorRole, category: args.category, note: args.note,
      status: "new" as const, createdAt: new Date().toISOString(),
    };
    await ctx.db.insert("observations", observation);
    return observation;
  },
});

export const setConsent = mutation({
  args: {
    secret: v.string(), patientId: v.string(), consentType: v.string(),
    granted: v.boolean(), actorEmail: v.string(),
  },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const existing = await ctx.db.query("consents")
      .withIndex("by_patient_type", (q) => q.eq("patientId", args.patientId).eq("consentType", args.consentType))
      .unique();
    const consent = {
      id: `${args.patientId}:${args.consentType}`, patientId: args.patientId,
      consentType: args.consentType, granted: args.granted, version: "1.0",
      actorEmail: args.actorEmail, updatedAt: new Date().toISOString(),
    };
    if (existing) await ctx.db.patch(existing._id, consent);
    else await ctx.db.insert("consents", consent);
    return consent;
  },
});

export const resetSessions = mutation({
  args: { secret: v.string(), patientId: v.string() },
  handler: async (ctx, args) => {
    requireServerSecret(args.secret);
    const sessions = await ctx.db.query("planSessions")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    for (const session of sessions) await ctx.db.delete(session._id);
    const entries = await ctx.db.query("planEntries")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    let removedEntries = 0;
    for (const entry of entries) {
      if (entry.sessionId || entry.category === "exercise") {
        await ctx.db.delete(entry._id);
        removedEntries += 1;
      }
    }
    const attempts = await ctx.db.query("attempts")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .collect();
    for (const attempt of attempts) await ctx.db.delete(attempt._id);
    return { sessions: sessions.length, entries: removedEntries, attempts: attempts.length };
  },
});
