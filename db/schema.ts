import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["patient", "family", "clinician", "admin"] }).notNull(),
  locale: text("locale").notNull().default("fr-CA"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const patientProfiles = sqliteTable("patient_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  preferredName: text("preferred_name").notNull(),
  preferredLanguage: text("preferred_language").notNull().default("fr-CA"),
  primaryGoal: text("primary_goal").notNull(),
  supervisionSummary: text("supervision_summary").notNull(),
  nextReviewDate: text("next_review_date").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const careLinks = sqliteTable("care_links", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patientProfiles.id),
  userId: text("user_id").notNull().references(() => users.id),
  relationship: text("relationship").notNull(),
  canViewRecordings: integer("can_view_recordings", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patientProfiles.id),
  domain: text("domain", { enum: ["communication", "mobility", "participation"] }).notNull(),
  title: text("title").notNull(),
  status: text("status", { enum: ["active", "paused", "achieved"] }).notNull().default("active"),
  progressNote: text("progress_note").notNull().default(""),
  reviewDate: text("review_date").notNull(),
});

export const exercises = sqliteTable("exercises", {
  id: text("id").primaryKey(),
  domain: text("domain", { enum: ["communication", "mobility", "participation"] }).notNull(),
  titleFr: text("title_fr").notNull(),
  titleEn: text("title_en").notNull(),
  instructionsFr: text("instructions_fr").notNull(),
  instructionsEn: text("instructions_en").notNull(),
  assistanceLevel: text("assistance_level").notNull(),
  repetitions: text("repetitions").notNull(),
  safetyNoteFr: text("safety_note_fr").notNull().default(""),
  safetyNoteEn: text("safety_note_en").notNull().default(""),
  clinicianName: text("clinician_name").notNull(),
  reviewedAt: text("reviewed_at").notNull(),
});

export const assignments = sqliteTable("assignments", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patientProfiles.id),
  exerciseId: text("exercise_id").notNull().references(() => exercises.id),
  scheduledDate: text("scheduled_date").notNull(),
  orderIndex: integer("order_index").notNull(),
  status: text("status", { enum: ["assigned", "completed", "paused"] }).notNull().default("assigned"),
});

export const attempts = sqliteTable("attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assignmentId: text("assignment_id").notNull().references(() => assignments.id),
  patientId: text("patient_id").notNull().references(() => patientProfiles.id),
  supportLevel: integer("support_level").notNull(),
  effort: integer("effort").notNull(),
  confidence: integer("confidence").notNull(),
  warningSymptom: text("warning_symptom"),
  completedAt: text("completed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const observations = sqliteTable("observations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: text("patient_id").notNull().references(() => patientProfiles.id),
  authorName: text("author_name").notNull(),
  authorRole: text("author_role").notNull(),
  category: text("category").notNull(),
  note: text("note").notNull(),
  status: text("status", { enum: ["new", "reviewed", "resolved"] }).notNull().default("new"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const alerts = sqliteTable("alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: text("patient_id").notNull().references(() => patientProfiles.id),
  severity: text("severity", { enum: ["info", "review", "urgent"] }).notNull(),
  source: text("source").notNull(),
  message: text("message").notNull(),
  status: text("status", { enum: ["open", "acknowledged", "closed"] }).notNull().default("open"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
