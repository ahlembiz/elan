import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const actorRole = v.union(v.literal("patient"), v.literal("family"), v.literal("admin"));
const planStatus = v.union(v.literal("active"), v.literal("completed"), v.literal("paused"));
const planCategory = v.union(v.literal("appointment"), v.literal("todo"), v.literal("diet"), v.literal("exercise"));
const safetyClass = v.union(v.literal("standard"), v.literal("supervised"), v.literal("clinical_review"));

export default defineSchema({
  planEntries: defineTable({
    id: v.string(),
    patientId: v.string(),
    category: planCategory,
    titleFr: v.string(),
    titleEn: v.string(),
    descriptionFr: v.string(),
    descriptionEn: v.string(),
    scheduledAt: v.optional(v.string()),
    status: planStatus,
    source: v.union(v.literal("curated"), v.literal("manual")),
    createdByRole: actorRole,
    createdByName: v.string(),
    evidenceTitle: v.optional(v.string()),
    evidenceUrl: v.optional(v.string()),
    safetyClass,
    points: v.number(),
    exerciseLibraryId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_patient", ["patientId"])
    .index("by_patient_external", ["patientId", "id"])
    .index("by_patient_session", ["patientId", "sessionId"]),

  planSessions: defineTable({
    id: v.string(),
    patientId: v.string(),
    kind: v.union(v.literal("daily"), v.literal("custom")),
    sessionDate: v.optional(v.string()),
    titleFr: v.string(),
    titleEn: v.string(),
    targetDuration: v.number(),
    effortLevel: v.number(),
    status: planStatus,
    createdByRole: actorRole,
    createdByName: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_patient", ["patientId"])
    .index("by_patient_external", ["patientId", "id"])
    .index("by_patient_date", ["patientId", "sessionDate"]),

  attempts: defineTable({
    id: v.string(),
    patientId: v.string(),
    assignmentId: v.string(),
    supportLevel: v.number(),
    effort: v.number(),
    confidence: v.number(),
    completedAt: v.string(),
  }).index("by_patient", ["patientId"]),

  observations: defineTable({
    id: v.string(),
    patientId: v.string(),
    authorName: v.string(),
    authorRole: actorRole,
    category: v.string(),
    note: v.string(),
    status: v.union(v.literal("new"), v.literal("reviewed"), v.literal("resolved")),
    createdAt: v.string(),
  }).index("by_patient", ["patientId"]),

  consents: defineTable({
    id: v.string(),
    patientId: v.string(),
    consentType: v.string(),
    granted: v.boolean(),
    version: v.string(),
    actorEmail: v.string(),
    updatedAt: v.string(),
  })
    .index("by_patient", ["patientId"])
    .index("by_patient_type", ["patientId", "consentType"]),
});
