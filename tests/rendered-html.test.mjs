import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appRoot = new URL("../app/", import.meta.url);

test("My Plan exposes every category, all three authors, and durable sessions", async () => {
  const [plan, api, schema] = await Promise.all([
    readFile(new URL("MyPlan.tsx", appRoot), "utf8"),
    readFile(new URL("api/plan/route.ts", appRoot), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
  ]);

  for (const category of ["appointments", "todos", "diet", "exercises"]) assert.match(plan, new RegExp(`id: "${category}"`));
  assert.match(api, /ACTOR_ROLES = new Set\(\["patient", "family", "admin"\]\)/);
  assert.match(api, /payload\.kind === "session"/);
  assert.match(api, /INSERT INTO plan_sessions/);
  assert.match(api, /plan_session\.created/);
  assert.match(api, /plan_entry\.status_changed/);
  assert.match(schema, /export const planSessions/);
  assert.match(schema, /sessionId: text\("session_id"\)/);
  assert.match(plan, /createSession/);
  assert.match(plan, /method: "POST"/);
  assert.match(plan, /method: "PATCH"/);
});

test("the research-backed catalog contains at least 50 graduated exercises", async () => {
  const [catalog, plan] = await Promise.all([
    readFile(new URL("api/plan/exerciseCatalog.ts", appRoot), "utf8"),
    readFile(new URL("MyPlan.tsx", appRoot), "utf8"),
  ]);
  const topics = catalog.slice(catalog.indexOf("const communicationTopics"), catalog.indexOf("const communicationFamilies")).match(/slug:/g)?.length ?? 0;
  const families = catalog.slice(catalog.indexOf("const communicationFamilies"), catalog.indexOf("const communicationExercises")).match(/slug:/g)?.length ?? 0;
  const mobilityTasks = catalog.match(/\["[^"]+", "[^"]+", "[^"]+"\]/g)?.length ?? 0;
  assert.ok(topics * families + mobilityTasks >= 50, `catalog generated ${topics * families + mobilityTasks} exercises`);
  for (const field of ["durationMinutes", "effortLevel", "difficulty", "stage", "assistanceFr", "evidenceUrl"]) assert.match(catalog, new RegExp(field));
  assert.match(catalog, /pubmed\.ncbi\.nlm\.nih\.gov\/29710193/);
  assert.match(catalog, /pubmed\.ncbi\.nlm\.nih\.gov\/24859467/);
  assert.match(catalog, /stroke-rehabilitation-delivery\/7-language-and-communication/);
  assert.match(catalog, /stroke-rehabilitation-delivery\/4-lower-extremity-balance-mobility-and-aerobic-training/);
  assert.match(plan, /ne modifie jamais la dose/);
  assert.match(plan, /validation clinique requise/);
  assert.match(plan, /L’alimentation ne remplace jamais un plan de déglutition/);
});

test("communication board has six themes and 60 bilingual messages", async () => {
  const app = await readFile(new URL("ElanApp.tsx", appRoot), "utf8");
  const boardBlock = app.slice(app.indexOf("const boardThemes"), app.indexOf("export default function ElanApp"));
  const themes = boardBlock.match(/id: "(essential|health|feelings|food|people|plans)"/g)?.length ?? 0;
  const messages = boardBlock.match(/\["[^"]+", "[^"]+", "[^"]+"\]/g)?.length ?? 0;
  assert.equal(themes, 6);
  assert.equal(messages, 60);
  assert.match(app, /Search 60 messages/);
  assert.match(app, /speechSynthesis\.speak/);
});

test("visible product CTAs are wired and day/night preference persists", async () => {
  const [app, plan, css] = await Promise.all([
    readFile(new URL("ElanApp.tsx", appRoot), "utf8"),
    readFile(new URL("MyPlan.tsx", appRoot), "utf8"),
    readFile(new URL("globals.css", appRoot), "utf8"),
  ]);
  const deadButtons = `${app}\n${plan}`.match(/<button(?![^>]*(?:onClick|type="submit"|disabled))[^>]*>/g) ?? [];
  assert.deepEqual(deadButtons, []);
  assert.match(app, /type Role = "patient" \| "family" \| "admin"/);
  assert.doesNotMatch(app, /role === "clinician"|ClinicianPortal|function Practice/);
  assert.match(app, /actorRole="family"/);
  assert.match(app, /localStorage\.setItem\("elan-theme", nextTheme\)/);
  assert.match(css, /html\[data-theme="night"\]/);
  assert.match(css, /\.session-builder/);
  assert.match(css, /\.board-theme-tabs/);
});

test("the patient home and navigation expose older-adult accessibility essentials", async () => {
  const [app, css] = await Promise.all([
    readFile(new URL("ElanApp.tsx", appRoot), "utf8"),
    readFile(new URL("globals.css", appRoot), "utf8"),
  ]);

  for (const destination of ["Accueil", "Mes séances", "Tableau", "Mon plan", "Progrès"]) assert.match(app, new RegExp(destination));
  for (const homeAction of ["Commencer ma séance", "J’ai besoin de communiquer", "Choisir une autre séance"]) assert.match(app, new RegExp(homeAction));
  assert.match(app, /className="skip-link" href="#main-content"/);
  assert.match(app, /aria-current=/);
  assert.match(app, /className="role-picker"/);
  assert.match(app, /className="help-button"/);
  assert.match(app, /Rechercher dans les messages/);
  assert.match(app, /localStorage\.setItem\("elan-text-size", nextSize\)/);
  assert.match(app, /aria-pressed=\{textSize === "large"\}/);
  assert.match(css, /html\[data-text-size="large"\]/);
  assert.match(css, /@media \(max-width: 860px\)/);
  assert.match(css, /\.nav-item \{ min-width: 0; min-height: 78px/);
  assert.match(css, /@media \(forced-colors: active\)/);
});
