import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appRoot = new URL("../app/", import.meta.url);

test("My Plan exposes every requested category and both durable write paths", async () => {
  const [plan, api, schema] = await Promise.all([
    readFile(new URL("MyPlan.tsx", appRoot), "utf8"),
    readFile(new URL("api/plan/route.ts", appRoot), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
  ]);

  for (const category of ["appointments", "todos", "diet", "exercises"]) {
    assert.match(plan, new RegExp(`id: "${category}"`));
  }
  assert.match(plan, /actorRole: ActorRole/);
  assert.match(plan, /method: "POST"/);
  assert.match(plan, /method: "PATCH"/);
  assert.match(api, /ACTOR_ROLES = new Set\(\["patient", "admin"\]\)/);
  assert.match(api, /INSERT INTO plan_entries/);
  assert.match(api, /plan_entry\.status_changed/);
  assert.match(schema, /export const planEntries/);
  assert.match(schema, /export const exerciseLibrary/);
});

test("clinical content keeps evidence and safety boundaries attached", async () => {
  const [plan, api] = await Promise.all([
    readFile(new URL("MyPlan.tsx", appRoot), "utf8"),
    readFile(new URL("api/plan/route.ts", appRoot), "utf8"),
  ]);

  assert.match(api, /pubmed\.ncbi\.nlm\.nih\.gov\/29710193/);
  assert.match(api, /pubmed\.ncbi\.nlm\.nih\.gov\/24859467/);
  assert.match(api, /stroke-rehabilitation-delivery\/7-language-and-communication/);
  assert.match(api, /stroke-rehabilitation-delivery\/4-lower-extremity-balance-mobility-and-aerobic-training/);
  assert.match(plan, /Une carte est un modèle — pas une prescription autonome/);
  assert.match(plan, /validation clinique requise/);
  assert.match(plan, /L’alimentation ne remplace jamais un plan de déglutition/);
});

test("the product navigation uses My Plan and persists day/night preference", async () => {
  const [app, css] = await Promise.all([
    readFile(new URL("ElanApp.tsx", appRoot), "utf8"),
    readFile(new URL("globals.css", appRoot), "utf8"),
  ]);

  assert.match(app, /type Role = "patient" \| "family" \| "admin"/);
  assert.match(app, /<MyPlan/);
  assert.doesNotMatch(app, /role === "clinician"|ClinicianPortal/);
  assert.match(app, /localStorage\.setItem\("elan-theme", nextTheme\)/);
  assert.match(css, /html\[data-theme="night"\]/);
  assert.match(css, /\.momentum-card/);
  assert.match(css, /\.exercise-research-card/);
});
