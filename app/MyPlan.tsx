"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type Language = "fr" | "en";
type ActorRole = "patient" | "admin";
type PlanTab = "overview" | "appointments" | "todos" | "diet" | "exercises";
type PlanCategory = "appointment" | "todo" | "diet" | "exercise";

type PlanEntry = {
  id: string;
  category: PlanCategory;
  titleFr: string;
  titleEn: string;
  descriptionFr: string;
  descriptionEn: string;
  scheduledAt: string | null;
  status: "active" | "completed" | "paused";
  source: "curated" | "manual";
  createdByRole: ActorRole;
  createdByName: string;
  evidenceTitle: string | null;
  evidenceUrl: string | null;
  safetyClass: "standard" | "supervised" | "clinical_review";
  points: number;
  exerciseLibraryId: string | null;
  createdAt: string;
};

type ExerciseTemplate = {
  id: string;
  domain: "communication" | "mobility";
  titleFr: string;
  titleEn: string;
  summaryFr: string;
  summaryEn: string;
  instructionsFr: string;
  instructionsEn: string;
  assistanceFr: string;
  assistanceEn: string;
  evidenceTitle: string;
  evidenceUrl: string;
  safetyClass: "standard" | "supervised" | "clinical_review";
  reviewRequired: boolean;
  difficulty: number;
};

const tabs: Array<{ id: PlanTab; category?: PlanCategory; mark: string }> = [
  { id: "overview", mark: "A" },
  { id: "appointments", category: "appointment", mark: "R" },
  { id: "todos", category: "todo", mark: "✓" },
  { id: "diet", category: "diet", mark: "D" },
  { id: "exercises", category: "exercise", mark: "E" },
];

const fallbackEntries: PlanEntry[] = [
  { id: "fallback-appointment", category: "appointment", titleFr: "Orthophonie — Marie-Claude", titleEn: "Speech therapy — Marie-Claude", descriptionFr: "Préparer les trois phrases personnelles à réviser.", descriptionEn: "Prepare the three personal phrases to review.", scheduledAt: "2026-07-16T10:30:00-04:00", status: "active", source: "curated", createdByRole: "admin", createdByName: "Équipe Élan", evidenceTitle: null, evidenceUrl: null, safetyClass: "standard", points: 20, exerciseLibraryId: null, createdAt: "2026-07-14" },
  { id: "fallback-todo", category: "todo", titleFr: "Choisir 3 questions pour le rendez-vous", titleEn: "Choose 3 questions for the appointment", descriptionFr: "Écrire, enregistrer ou montrer les questions — toutes les formes sont valides.", descriptionEn: "Write, record, or point to the questions — every form is valid.", scheduledAt: "2026-07-15T18:00:00-04:00", status: "active", source: "curated", createdByRole: "admin", createdByName: "Équipe Élan", evidenceTitle: null, evidenceUrl: null, safetyClass: "standard", points: 10, exerciseLibraryId: null, createdAt: "2026-07-14" },
];

function tabLabel(tab: PlanTab, language: Language) {
  const labels = {
    overview: ["Mon plan", "My plan"],
    appointments: ["Mes rendez-vous", "My appointments"],
    todos: ["Mes tâches", "My to-dos"],
    diet: ["Mon alimentation", "My diet"],
    exercises: ["Mes exercices", "My exercises"],
  } as const;
  return labels[tab][language === "fr" ? 0 : 1];
}

function categoryLabel(category: PlanCategory, language: Language) {
  const labels = {
    appointment: ["Rendez-vous", "Appointment"],
    todo: ["Tâche", "To-do"],
    diet: ["Alimentation", "Diet"],
    exercise: ["Exercice", "Exercise"],
  } as const;
  return labels[category][language === "fr" ? 0 : 1];
}

function safetyLabel(value: PlanEntry["safetyClass"] | ExerciseTemplate["safetyClass"], language: Language) {
  const labels = {
    standard: ["Plan personnalisé", "Personalized plan"],
    supervised: ["Supervision requise", "Supervision required"],
    clinical_review: ["Validation clinique requise", "Clinical approval required"],
  } as const;
  return labels[value][language === "fr" ? 0 : 1];
}

export default function MyPlan({ language, initialTab = "overview", actorRole, attemptCount = 0 }: { language: Language; initialTab?: string; actorRole: ActorRole; attemptCount?: number }) {
  const normalizedTab = tabs.some((item) => item.id === initialTab) ? initialTab as PlanTab : "overview";
  const [selectedTab, setSelectedTab] = useState<PlanTab>(normalizedTab);
  const [entries, setEntries] = useState<PlanEntry[]>(fallbackEntries);
  const [library, setLibrary] = useState<ExerciseTemplate[]>([]);
  const [status, setStatus] = useState<"loading" | "saved" | "offline">("loading");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorCategory, setEditorCategory] = useState<PlanCategory>("todo");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/plan")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { entries: PlanEntry[]; library: ExerciseTemplate[] }) => {
        setEntries(data.entries);
        setLibrary(data.library);
        setStatus("saved");
      })
      .catch(() => setStatus("offline"));
  }, []);

  const completed = entries.filter((entry) => entry.status === "completed");
  const momentum = Math.min(240, 40 + attemptCount * 15 + completed.reduce((sum, entry) => sum + entry.points, 0));
  const level = momentum >= 180 ? 3 : momentum >= 90 ? 2 : 1;
  const levelFloor = level === 1 ? 0 : level === 2 ? 90 : 180;
  const levelCeiling = level === 1 ? 90 : level === 2 ? 180 : 240;
  const levelProgress = Math.min(100, Math.round(((momentum - levelFloor) / (levelCeiling - levelFloor)) * 100));

  const visibleEntries = useMemo(() => {
    if (selectedTab === "overview") return entries.filter((entry) => entry.status === "active").slice(0, 5);
    const category = tabs.find((tab) => tab.id === selectedTab)?.category;
    return entries.filter((entry) => entry.category === category);
  }, [entries, selectedTab]);

  const openEditor = (category?: PlanCategory) => {
    setEditorCategory(category ?? tabs.find((tab) => tab.id === selectedTab)?.category ?? "todo");
    setEditorOpen(true);
  };

  const addEntry = async (payload: Record<string, unknown>, savingKey = "manual") => {
    setSavingId(savingKey);
    try {
      const response = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, createdByRole: actorRole }) });
      if (!response.ok) throw new Error();
      const { entry } = await response.json() as { entry: PlanEntry };
      setEntries((current) => [entry, ...current]);
      setStatus("saved");
      setEditorOpen(false);
    } catch {
      setStatus("offline");
    } finally {
      setSavingId(null);
    }
  };

  const toggleEntry = async (entry: PlanEntry) => {
    const nextStatus = entry.status === "completed" ? "active" : "completed";
    setSavingId(entry.id);
    try {
      const response = await fetch("/api/plan", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: entry.id, status: nextStatus, createdByRole: actorRole }) });
      if (!response.ok) throw new Error();
      const { entry: updated } = await response.json() as { entry: PlanEntry };
      setEntries((current) => current.map((item) => item.id === updated.id ? updated : item));
      setStatus("saved");
    } catch {
      setStatus("offline");
    } finally {
      setSavingId(null);
    }
  };

  return <section className="plan-workspace">
    <div className="plan-title-row">
      <div>
        <p className="eyebrow">{actorRole === "admin" ? (language === "fr" ? "Administration du plan" : "Plan administration") : (language === "fr" ? "Votre espace de récupération" : "Your recovery space")}</p>
        <h2>{language === "fr" ? "Mon plan" : "My plan"}</h2>
        <p>{language === "fr" ? "Un seul endroit pour savoir ce qui vient, ce qui compte et ce qui évolue." : "One place to see what is next, what matters, and what is changing."}</p>
      </div>
      <div className="plan-title-actions">
        <span className={`data-status ${status}`}><i />{status === "loading" ? (language === "fr" ? "Chargement" : "Loading") : status === "saved" ? (language === "fr" ? "Plan synchronisé" : "Plan synced") : (language === "fr" ? "Mode hors ligne" : "Offline mode")}</span>
        <button className="portal-primary" onClick={() => openEditor()}>+ {language === "fr" ? "Ajouter au plan" : "Add to plan"}</button>
      </div>
    </div>

    <nav className="plan-tabs" aria-label={language === "fr" ? "Sections de mon plan" : "My plan sections"}>
      {tabs.map((tab) => <button key={tab.id} className={selectedTab === tab.id ? "selected" : ""} onClick={() => setSelectedTab(tab.id)}><span>{tab.mark}</span>{tabLabel(tab.id, language)}<small>{tab.category ? entries.filter((entry) => entry.category === tab.category && entry.status === "active").length : entries.filter((entry) => entry.status === "active").length}</small></button>)}
    </nav>

    {selectedTab === "overview" && <>
      <div className="plan-momentum-grid">
        <article className="momentum-card">
          <div className="momentum-copy"><p className="eyebrow">{language === "fr" ? "Évolution personnelle" : "Personal evolution"}</p><h3>{language === "fr" ? "Votre élan prend forme" : "Your momentum is taking shape"}</h3><p>{language === "fr" ? "Les pauses ne retirent jamais de progrès. Chaque action terminée ajoute un repère à votre propre parcours." : "Rest never removes progress. Each completed action adds a marker to your own journey."}</p></div>
          <div className="momentum-orbit" aria-label={`${momentum} points`}><strong>{momentum}</strong><span>{language === "fr" ? "points d’élan" : "momentum points"}</span></div>
          <div className="level-track"><span style={{ width: `${levelProgress}%` }} /></div>
          <div className="level-copy"><b>{language === "fr" ? `Niveau ${level} · Capacité en construction` : `Level ${level} · Capacity in progress`}</b><small>{levelCeiling - momentum} {language === "fr" ? "points avant le prochain repère" : "points to the next marker"}</small></div>
        </article>
        <article className="evolution-card card-surface">
          <p className="eyebrow">{language === "fr" ? "4 dernières semaines" : "Last 4 weeks"}</p><h3>{language === "fr" ? "Moins d’aide, plus de choix" : "Less help, more choice"}</h3>
          <div className="evolution-bars" aria-label={language === "fr" ? "Tendance de progression" : "Progress trend"}>{[34, 46, 59, Math.min(86, 66 + completed.length * 4)].map((value, index) => <div key={index}><span style={{ height: `${value}%` }} className={index === 3 ? "current" : ""}><b>{value}%</b></span><small>S{index + 1}</small></div>)}</div>
          <p>{language === "fr" ? "Tendance descriptive — à interpréter avec l’équipe, jamais comme un score clinique." : "Descriptive trend — interpret with the care team, never as a clinical score."}</p>
        </article>
      </div>
      <div className="plan-domain-grid">{(["appointment", "todo", "diet", "exercise"] as PlanCategory[]).map((category, index) => { const total = entries.filter((entry) => entry.category === category).length; const done = entries.filter((entry) => entry.category === category && entry.status === "completed").length; return <button key={category} onClick={() => setSelectedTab(tabs[index + 1].id)}><span>{["R", "✓", "D", "E"][index]}</span><b>{categoryLabel(category, language)}</b><small>{done}/{total} {language === "fr" ? "complétés" : "completed"}</small><i><em style={{ width: `${total ? Math.round(done / total * 100) : 0}%` }} /></i></button>; })}</div>
    </>}

    {selectedTab === "diet" && <div className="plan-safety-note"><span>!</span><div><b>{language === "fr" ? "L’alimentation ne remplace jamais un plan de déglutition." : "Food planning never replaces a swallowing plan."}</b><p>{language === "fr" ? "Élan ne modifie ni textures, ni liquides, ni restrictions. Ces décisions exigent une évaluation et un plan individualisé de votre orthophoniste ou diététiste." : "Élan never changes textures, fluids, or restrictions. Those decisions require assessment and an individualized plan from your speech-language pathologist or dietitian."}</p><a href="https://www.strokebestpractices.ca/recommendations/stroke-rehabilitation-delivery/6-swallowing-nutrition-and-oral-care" target="_blank" rel="noreferrer">{language === "fr" ? "Recommandations canadiennes ↗" : "Canadian recommendations ↗"}</a></div></div>}

    <div className="plan-section-heading"><div><p className="eyebrow">{selectedTab === "overview" ? (language === "fr" ? "À venir" : "Coming up") : categoryLabel(tabs.find((tab) => tab.id === selectedTab)?.category ?? "todo", language)}</p><h3>{selectedTab === "overview" ? (language === "fr" ? "Les prochains repères" : "Your next markers") : tabLabel(selectedTab, language)}</h3></div>{selectedTab !== "overview" && <button className="plan-add-inline" onClick={() => openEditor()}>+ {language === "fr" ? "Nouvelle entrée" : "New entry"}</button>}</div>
    <div className="plan-entry-list">{visibleEntries.length ? visibleEntries.map((entry) => <PlanEntryCard key={entry.id} entry={entry} language={language} saving={savingId === entry.id} onToggle={() => toggleEntry(entry)} />) : <div className="plan-empty card-surface"><span>◇</span><h3>{language === "fr" ? "Cet espace est prêt." : "This space is ready."}</h3><p>{language === "fr" ? "Ajoutez une entrée manuellement ou choisissez du contenu validé." : "Add an entry manually or choose validated content."}</p><button onClick={() => openEditor()}>{language === "fr" ? "Ajouter maintenant" : "Add now"}</button></div>}</div>

    {selectedTab === "exercises" && <section className="curated-library">
      <div className="curated-heading"><div><p className="eyebrow">{language === "fr" ? "Bibliothèque de recherche" : "Research library"}</p><h3>{language === "fr" ? "Exercices à personnaliser avec l’équipe" : "Exercises to personalize with the care team"}</h3><p>{language === "fr" ? "Chaque carte cite sa source et conserve son niveau de sécurité. Une carte est un modèle — pas une prescription autonome." : "Every card cites its source and preserves its safety level. A card is a template—not an independent prescription."}</p></div><span>{library.length} {language === "fr" ? "exercices" : "exercises"}</span></div>
      <div className="exercise-library-grid">{library.map((item) => { const alreadyAdded = entries.some((entry) => entry.exerciseLibraryId === item.id && entry.status === "active"); return <article className="exercise-research-card card-surface" key={item.id}><div className="exercise-card-top"><span className={`exercise-domain ${item.domain}`}>{item.domain === "communication" ? (language === "fr" ? "Communication" : "Communication") : (language === "fr" ? "Physiothérapie" : "Physiotherapy")}</span><span className={`safety-chip ${item.safetyClass}`}>{safetyLabel(item.safetyClass, language)}</span></div><h3>{language === "fr" ? item.titleFr : item.titleEn}</h3><p>{language === "fr" ? item.summaryFr : item.summaryEn}</p><div className="exercise-assistance"><b>{language === "fr" ? "Assistance" : "Assistance"}</b><span>{language === "fr" ? item.assistanceFr : item.assistanceEn}</span></div><a className="evidence-link" href={item.evidenceUrl} target="_blank" rel="noreferrer"><span>↗</span><div><small>{language === "fr" ? "Étude ou recommandation" : "Study or guideline"}</small><b>{item.evidenceTitle}</b></div></a><button className="exercise-add-button" disabled={alreadyAdded || savingId === item.id} onClick={() => addEntry({ templateId: item.id }, item.id)}>{savingId === item.id ? (language === "fr" ? "Ajout…" : "Adding…") : alreadyAdded ? (language === "fr" ? "✓ Dans mon plan" : "✓ In my plan") : (language === "fr" ? "+ Ajouter à mon plan" : "+ Add to my plan")}</button></article>; })}</div>
    </section>}

    {editorOpen && <PlanEditor language={language} category={editorCategory} actorRole={actorRole} saving={savingId === "manual"} onClose={() => setEditorOpen(false)} onSave={(payload) => addEntry(payload)} />}
  </section>;
}

function PlanEntryCard({ entry, language, saving, onToggle }: { entry: PlanEntry; language: Language; saving: boolean; onToggle: () => void }) {
  const date = entry.scheduledAt ? new Date(entry.scheduledAt) : null;
  return <article className={`plan-entry-card card-surface ${entry.status}`}>
    <button className="plan-check" onClick={onToggle} disabled={saving} aria-label={entry.status === "completed" ? (language === "fr" ? "Marquer comme active" : "Mark active") : (language === "fr" ? "Marquer comme terminée" : "Mark complete")}>{entry.status === "completed" ? "✓" : ""}</button>
    <div className="plan-entry-body"><div className="plan-entry-meta"><span className={`category-tag ${entry.category}`}>{categoryLabel(entry.category, language)}</span>{date && <time>{date.toLocaleString(language === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium", timeStyle: "short" })}</time>}<span>{entry.source === "curated" ? (language === "fr" ? "Contenu validé" : "Curated") : (language === "fr" ? "Ajout manuel" : "Manual")}</span></div><h3>{language === "fr" ? entry.titleFr : entry.titleEn}</h3>{(language === "fr" ? entry.descriptionFr : entry.descriptionEn) && <p>{language === "fr" ? entry.descriptionFr : entry.descriptionEn}</p>}<div className="plan-entry-footer"><span>{language === "fr" ? "Ajouté par" : "Added by"} <b>{entry.createdByName}</b></span>{entry.safetyClass !== "standard" && <span className={`safety-chip ${entry.safetyClass}`}>{safetyLabel(entry.safetyClass, language)}</span>}{entry.evidenceUrl && <a href={entry.evidenceUrl} target="_blank" rel="noreferrer">{language === "fr" ? "Voir la recherche ↗" : "View research ↗"}</a>}</div></div>
    <div className="plan-points">+{entry.points}<small>{language === "fr" ? "élan" : "momentum"}</small></div>
  </article>;
}

function PlanEditor({ language, category, actorRole, saving, onClose, onSave }: { language: Language; category: PlanCategory; actorRole: ActorRole; saving: boolean; onClose: () => void; onSave: (payload: Record<string, unknown>) => void }) {
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const submit = (event: FormEvent) => { event.preventDefault(); if (title.trim()) onSave({ category: selectedCategory, title, description, scheduledAt }); };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><form className="plan-editor" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="plan-editor-title"><div className="modal-header"><div><p className="eyebrow">{actorRole === "admin" ? (language === "fr" ? "Ajout administrateur" : "Admin entry") : (language === "fr" ? "Ajout personnel" : "Personal entry")}</p><h2 id="plan-editor-title">{language === "fr" ? "Ajouter à mon plan" : "Add to my plan"}</h2></div><button className="close-button" type="button" onClick={onClose} aria-label={language === "fr" ? "Fermer" : "Close"}>×</button></div><label>{language === "fr" ? "Catégorie" : "Category"}<select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value as PlanCategory)}>{(["appointment", "todo", "diet", "exercise"] as PlanCategory[]).map((item) => <option value={item} key={item}>{categoryLabel(item, language)}</option>)}</select></label><label>{language === "fr" ? "Titre" : "Title"}<input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder={language === "fr" ? "Ce que vous voulez ajouter" : "What you want to add"} required /></label><label>{language === "fr" ? "Détails (facultatif)" : "Details (optional)"}<textarea value={description} maxLength={800} onChange={(event) => setDescription(event.target.value)} placeholder={language === "fr" ? "Notes, lieu ou préparation" : "Notes, location, or preparation"} /></label><label>{language === "fr" ? "Date et heure (facultatif)" : "Date and time (optional)"}<input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label>{selectedCategory === "exercise" && <div className="editor-boundary"><span>!</span><p>{language === "fr" ? "Un exercice ajouté manuellement est marqué « validation clinique requise ». Utilisez la bibliothèque validée pour conserver la source et le niveau de sécurité." : "A manually added exercise is marked ‘clinical approval required.’ Use the curated library to preserve the evidence source and safety level."}</p></div>}<div className="editor-actions"><button type="button" className="secondary-button" onClick={onClose}>{language === "fr" ? "Annuler" : "Cancel"}</button><button className="portal-primary" disabled={!title.trim() || saving}>{saving ? (language === "fr" ? "Ajout…" : "Adding…") : (language === "fr" ? "Ajouter au plan" : "Add to plan")}</button></div></form></div>;
}
