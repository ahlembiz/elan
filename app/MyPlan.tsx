"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import GuidedSession from "./GuidedSession";
import type { GuidedSessionData, GuidedSessionEntry } from "./GuidedSession";
import { exerciseCatalog } from "./api/plan/exerciseCatalog";

type Language = "fr" | "en";
type ActorRole = "patient" | "family" | "admin";
type PlanTab = "overview" | "appointments" | "todos" | "diet" | "exercises";
type PlanCategory = "appointment" | "todo" | "diet" | "exercise";
type PlanStatus = "active" | "completed" | "paused";

type PlanEntry = {
  id: string; category: PlanCategory; titleFr: string; titleEn: string; descriptionFr: string;
  descriptionEn: string; scheduledAt: string | null; status: PlanStatus; source: "curated" | "manual";
  createdByRole: ActorRole; createdByName: string; evidenceTitle: string | null; evidenceUrl: string | null;
  safetyClass: "standard" | "supervised" | "clinical_review"; points: number;
  exerciseLibraryId: string | null; sessionId: string | null; createdAt: string;
  assistanceFr?: string; assistanceEn?: string; durationMinutes?: number; effortLevel?: number;
};

type ExerciseTemplate = {
  id: string; domain: "communication" | "mobility"; theme: string; titleFr: string; titleEn: string;
  summaryFr: string; summaryEn: string; instructionsFr: string; instructionsEn: string;
  assistanceFr: string; assistanceEn: string; evidenceTitle: string; evidenceUrl: string;
  safetyClass: "standard" | "supervised" | "clinical_review"; reviewRequired: boolean;
  difficulty: number; effortLevel: number; durationMinutes: number; stage: "foundation" | "build" | "challenge";
  equipmentFr: string; equipmentEn: string; requiresPartner: boolean;
};

type PlanSession = {
  id: string; titleFr: string; titleEn: string; targetDuration: number; effortLevel: number;
  status: PlanStatus; createdByRole: ActorRole; createdByName: string; createdAt: string;
  kind?: "daily" | "custom"; sessionDate?: string;
};

const tabs: Array<{ id: PlanTab; category?: PlanCategory; mark: string }> = [
  { id: "overview", mark: "⭐" }, { id: "appointments", category: "appointment", mark: "📅" },
  { id: "todos", category: "todo", mark: "✅" }, { id: "diet", category: "diet", mark: "🍽️" },
  { id: "exercises", category: "exercise", mark: "🎯" },
];

const fallbackEntries: PlanEntry[] = [
  { id: "fallback-appointment", category: "appointment", titleFr: "Orthophonie — Marie-Claude", titleEn: "Speech therapy — Marie-Claude", descriptionFr: "Préparer les trois phrases personnelles à réviser.", descriptionEn: "Prepare the three personal phrases to review.", scheduledAt: "2026-07-16T10:30:00-04:00", status: "active", source: "curated", createdByRole: "admin", createdByName: "Équipe Élan", evidenceTitle: null, evidenceUrl: null, safetyClass: "standard", points: 20, exerciseLibraryId: null, sessionId: null, createdAt: "2026-07-14" },
  { id: "fallback-todo", category: "todo", titleFr: "Choisir 3 questions pour le rendez-vous", titleEn: "Choose 3 questions for the appointment", descriptionFr: "Écrire, enregistrer ou montrer les questions — toutes les formes sont valides.", descriptionEn: "Write, record, or point to the questions — every form is valid.", scheduledAt: "2026-07-15T18:00:00-04:00", status: "active", source: "curated", createdByRole: "admin", createdByName: "Équipe Élan", evidenceTitle: null, evidenceUrl: null, safetyClass: "standard", points: 10, exerciseLibraryId: null, sessionId: null, createdAt: "2026-07-14" },
];

function tabLabel(tab: PlanTab, language: Language) {
  const labels = { overview: ["Mon plan", "My plan"], appointments: ["Mes rendez-vous", "My appointments"], todos: ["Mes tâches", "My to-dos"], diet: ["Mon alimentation", "My diet"], exercises: ["Mes séances", "My sessions"] } as const;
  return labels[tab][language === "fr" ? 0 : 1];
}

function categoryLabel(category: PlanCategory, language: Language) {
  const labels = { appointment: ["Rendez-vous", "Appointment"], todo: ["Tâche", "To-do"], diet: ["Alimentation", "Diet"], exercise: ["Exercice", "Exercise"] } as const;
  return labels[category][language === "fr" ? 0 : 1];
}

function safetyLabel(value: PlanEntry["safetyClass"] | ExerciseTemplate["safetyClass"], language: Language) {
  const labels = { standard: ["Plan personnalisé", "Personalized plan"], supervised: ["Supervision requise", "Supervision required"], clinical_review: ["Validation clinique requise", "Clinical approval required"] } as const;
  return labels[value][language === "fr" ? 0 : 1];
}

function stageLabel(stage: ExerciseTemplate["stage"], language: Language) {
  const labels = { foundation: ["Fondations", "Foundation"], build: ["Progression", "Build"], challenge: ["Défi", "Challenge"] } as const;
  return labels[stage][language === "fr" ? 0 : 1];
}

const stageEmoji = { foundation: "🌱", build: "🌿", challenge: "🌳" } as const;

const themeEmoji: Record<string, string> = {
  food: "🍽️", people: "👥", home: "🏠", health: "🩺", places: "🗺️", leisure: "🎨", planning: "📅", technology: "📱", safety: "🛟",
  clothing: "👕", shopping: "🛒", weather: "⛅", routine: "🌅", hygiene: "🧼", visits: "👋", news: "📰", nature: "🌳", money: "💳", memories: "📖",
  "seated-control": "🪑", transfers: "🔄", "standing-balance": "🧍", "gait-preparation": "👣", "functional-mobility": "🚶", strength: "💪", walking: "🥾", endurance: "🔋",
};

function themeIcon(theme: string, domain: "communication" | "mobility") {
  return themeEmoji[theme] ?? (domain === "communication" ? "💬" : "🚶");
}

function LevelRing({ level, progress, label }: { level: number; progress: number; label: string }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  return <div className="level-ring" role="img" aria-label={`${label} ${level}`}>
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle className="ring-track" cx="60" cy="60" r={radius} />
      <circle className="ring-fill" cx="60" cy="60" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - Math.min(100, Math.max(0, progress)) / 100)} />
    </svg>
    <div><strong>{level}</strong><small>{label}</small></div>
  </div>;
}

function EffortDots({ value, label }: { value: number; label: string }) {
  return <span className="effort-dots" aria-label={`${label}: ${value}/5`}><small>{label}</small>{[1, 2, 3, 4, 5].map((dot) => <i key={dot} className={dot <= value ? "filled" : ""} />)}</span>;
}

function toGuidedSession(session: PlanSession, entries: PlanEntry[], library: ExerciseTemplate[]): GuidedSessionData {
  return {
    ...session,
    entries: entries.filter((entry) => entry.sessionId === session.id).map((entry) => {
      const template = entry.exerciseLibraryId ? library.find((item) => item.id === entry.exerciseLibraryId) : undefined;
      return {
        id: entry.id,
        titleFr: entry.titleFr,
        titleEn: entry.titleEn,
        descriptionFr: entry.descriptionFr,
        descriptionEn: entry.descriptionEn,
        assistanceFr: entry.assistanceFr ?? template?.assistanceFr,
        assistanceEn: entry.assistanceEn ?? template?.assistanceEn,
        evidenceTitle: entry.evidenceTitle,
        evidenceUrl: entry.evidenceUrl,
        safetyClass: entry.safetyClass,
        durationMinutes: entry.durationMinutes ?? template?.durationMinutes,
        effortLevel: entry.effortLevel ?? template?.effortLevel,
        status: entry.status,
        exerciseLibraryId: entry.exerciseLibraryId,
      };
    }),
  };
}

export default function MyPlan({ language, initialTab = "overview", actorRole, attemptCount = 0, onFocusChange }: { language: Language; initialTab?: string; actorRole: ActorRole; attemptCount?: number; onFocusChange?: (focused: boolean) => void }) {
  const normalizedTab = tabs.some((item) => item.id === initialTab) ? initialTab as PlanTab : "overview";
  const [selectedTab, setSelectedTab] = useState<PlanTab>(normalizedTab);
  const [entries, setEntries] = useState<PlanEntry[]>(fallbackEntries);
  const [library, setLibrary] = useState<ExerciseTemplate[]>([]);
  const [sessions, setSessions] = useState<PlanSession[]>([]);
  const [status, setStatus] = useState<"loading" | "saved" | "offline">("loading");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorCategory, setEditorCategory] = useState<PlanCategory>("todo");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [sessionDomain, setSessionDomain] = useState<"all" | "communication" | "mobility">("all");
  const [sessionDuration, setSessionDuration] = useState(15);
  const [sessionEffort, setSessionEffort] = useState(2);
  const [sessionComplexity, setSessionComplexity] = useState(2);
  const [libraryDomain, setLibraryDomain] = useState<"all" | "communication" | "mobility">("all");
  const [libraryEffort, setLibraryEffort] = useState(5);
  const [libraryComplexity, setLibraryComplexity] = useState(5);
  const [libraryDuration, setLibraryDuration] = useState(20);
  const [librarySearch, setLibrarySearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const [activeGuidedSession, setActiveGuidedSession] = useState<GuidedSessionData | null>(null);
  const [studioStage, setStudioStage] = useState<"time" | "energy" | "focus" | "preview">("time");
  const [variation, setVariation] = useState(0);
  const [libraryOpen, setLibraryOpen] = useState(false);

  useEffect(() => {
    onFocusChange?.(Boolean(activeGuidedSession));
    return () => onFocusChange?.(false);
  }, [activeGuidedSession, onFocusChange]);

  useEffect(() => {
    fetch("/api/plan")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { entries: PlanEntry[]; library: ExerciseTemplate[]; sessions: PlanSession[] }) => {
        setEntries(data.entries); setLibrary(data.library); setSessions(data.sessions); setStatus("saved");
      })
      .catch(() => { setLibrary(exerciseCatalog as ExerciseTemplate[]); setStatus("offline"); });
  }, []);

  const completed = entries.filter((entry) => entry.status === "completed");
  const momentum = Math.min(480, 40 + attemptCount * 15 + completed.reduce((sum, entry) => sum + entry.points, 0));
  const level = Math.min(5, 1 + Math.floor(momentum / 100));
  const levelProgress = Math.min(100, momentum % 100);

  const visibleEntries = useMemo(() => {
    if (selectedTab === "overview") return entries.filter((entry) => entry.status === "active").slice(0, 5);
    const category = tabs.find((tab) => tab.id === selectedTab)?.category;
    return entries.filter((entry) => entry.category === category);
  }, [entries, selectedTab]);

  const roleLibrary = useMemo(() => actorRole === "patient"
    ? library.filter((item) => !item.requiresPartner)
    : actorRole === "family"
      ? library.filter((item) => item.requiresPartner)
      : library, [library, actorRole]);

  const recommended = useMemo(() => {
    const candidates = roleLibrary
      .filter((item) => (sessionDomain === "all" || item.domain === sessionDomain) && item.effortLevel <= sessionEffort && item.difficulty <= sessionComplexity && item.durationMinutes <= sessionDuration)
      .sort((a, b) => Math.abs(a.effortLevel - sessionEffort) - Math.abs(b.effortLevel - sessionEffort) || a.durationMinutes - b.durationMinutes);
    const ordered = sessionDomain === "all"
      ? Array.from({ length: Math.max(candidates.filter((item) => item.domain === "communication").length, candidates.filter((item) => item.domain === "mobility").length) }, (_, index) => [candidates.filter((item) => item.domain === "communication")[index], candidates.filter((item) => item.domain === "mobility")[index]]).flat().filter((item): item is ExerciseTemplate => Boolean(item))
      : candidates;
    const offset = ordered.length ? variation % ordered.length : 0;
    const rotated = ordered.slice(offset).concat(ordered.slice(0, offset));
    const picked: ExerciseTemplate[] = [];
    const seenTopics = new Set<string>();
    const topicOf = (item: ExerciseTemplate) => item.titleFr.split("·")[1]?.trim() ?? item.id;
    let total = 0;
    for (const item of rotated) {
      if (picked.length >= 5) break;
      if (seenTopics.has(topicOf(item))) continue;
      if (total + item.durationMinutes <= sessionDuration || picked.length === 0) {
        picked.push(item); total += item.durationMinutes; seenTopics.add(topicOf(item));
      }
    }
    return picked;
  }, [roleLibrary, sessionComplexity, sessionDomain, sessionDuration, sessionEffort, variation]);

  const filteredLibrary = useMemo(() => {
    const query = librarySearch.trim().toLocaleLowerCase(language === "fr" ? "fr-CA" : "en-CA");
    return roleLibrary.filter((item) => {
      const haystack = `${item.titleFr} ${item.titleEn} ${item.summaryFr} ${item.summaryEn} ${item.theme}`.toLocaleLowerCase(language === "fr" ? "fr-CA" : "en-CA");
      return (libraryDomain === "all" || item.domain === libraryDomain) && item.effortLevel <= libraryEffort && item.difficulty <= libraryComplexity && item.durationMinutes <= libraryDuration && (!query || haystack.includes(query));
    });
  }, [language, roleLibrary, libraryComplexity, libraryDomain, libraryDuration, libraryEffort, librarySearch]);

  const openEditor = (category?: PlanCategory) => {
    setEditorCategory(category ?? tabs.find((tab) => tab.id === selectedTab)?.category ?? "todo"); setEditorOpen(true);
  };

  const addEntry = async (payload: Record<string, unknown>, savingKey = "manual") => {
    setSavingId(savingKey);
    try {
      const response = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, createdByRole: actorRole }) });
      if (!response.ok) throw new Error();
      const { entry } = await response.json() as { entry: PlanEntry };
      setEntries((current) => [entry, ...current]); setStatus("saved"); setEditorOpen(false);
    } catch { setStatus("offline"); } finally { setSavingId(null); }
  };

  const createSession = async () => {
    if (!recommended.length) return;
    setSavingId("session");
    try {
      const response = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "session", templateIds: recommended.map((item) => item.id), targetDuration: sessionDuration, effortLevel: sessionEffort, createdByRole: actorRole }) });
      if (!response.ok) throw new Error();
      const result = await response.json() as { session: PlanSession; entries: PlanEntry[] };
      setSessions((current) => [result.session, ...current]); setEntries((current) => [...result.entries, ...current]); setStatus("saved");
      setStudioStage("time"); setVariation(0);
      if (actorRole !== "admin") setActiveGuidedSession(toGuidedSession(result.session, result.entries, library));
    } catch {
      setStatus("offline");
      if (actorRole !== "admin" && recommended.length) {
        const stamp = Date.now();
        setStudioStage("time"); setVariation(0);
        setActiveGuidedSession({
          id: `local-session-${stamp}`,
          kind: "custom",
          titleFr: "Séance personnalisée",
          titleEn: "Custom session",
          targetDuration: recommended.reduce((sum, item) => sum + item.durationMinutes, 0),
          effortLevel: sessionEffort,
          status: "active",
          entries: recommended.map((item, index) => ({
            id: `local-entry-${stamp}-${index}`,
            titleFr: item.titleFr,
            titleEn: item.titleEn,
            descriptionFr: item.instructionsFr,
            descriptionEn: item.instructionsEn,
            assistanceFr: item.assistanceFr,
            assistanceEn: item.assistanceEn,
            evidenceTitle: item.evidenceTitle,
            evidenceUrl: item.evidenceUrl,
            safetyClass: item.safetyClass,
            durationMinutes: item.durationMinutes,
            effortLevel: item.effortLevel,
            status: "active",
            exerciseLibraryId: item.id,
          })),
        });
      }
    } finally { setSavingId(null); }
  };

  const completeGuidedEntry = async (entry: GuidedSessionEntry) => {
    if (entry.id.startsWith("local-")) return;
    const response = await fetch("/api/plan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: entry.id, status: "completed" }),
    });
    if (!response.ok) throw new Error("Unable to save exercise");
    const { entry: updated } = await response.json() as { entry: PlanEntry };
    setEntries((current) => current.map((item) => item.id === updated.id ? updated : item));
    setStatus("saved");
  };

  const completeGuidedSession = async (session: GuidedSessionData) => {
    if (session.id.startsWith("local-session")) return null;
    const response = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "complete_session", sessionId: session.id, replaceDaily: session.kind === "daily" }),
    });
    if (!response.ok) throw new Error("Unable to complete session");
    const result = await response.json() as { replacement: GuidedSessionData | null };
    setSessions((current) => current.map((item) => item.id === session.id ? { ...item, status: "completed" } : item));
    setEntries((current) => current.map((item) => item.sessionId === session.id ? { ...item, status: "completed" } : item));
    const refreshed = await fetch("/api/plan");
    if (refreshed.ok) {
      const data = await refreshed.json() as { entries: PlanEntry[]; library: ExerciseTemplate[]; sessions: PlanSession[] };
      setEntries(data.entries);
      setLibrary(data.library);
      setSessions(data.sessions);
    }
    setStatus("saved");
    return result.replacement;
  };

  const openSession = (session: PlanSession) => {
    if (actorRole === "admin") {
      setSelectedTab("exercises");
      return;
    }
    setActiveGuidedSession(toGuidedSession(session, entries, library));
  };

  const toggleEntry = async (entry: PlanEntry) => {
    const nextStatus = entry.status === "completed" ? "active" : "completed";
    setSavingId(entry.id);
    try {
      const response = await fetch("/api/plan", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: entry.id, status: nextStatus, createdByRole: actorRole }) });
      if (!response.ok) throw new Error();
      const { entry: updated } = await response.json() as { entry: PlanEntry };
      setEntries((current) => {
        const next = current.map((item) => item.id === updated.id ? updated : item);
        if (updated.sessionId) setSessions((all) => all.map((session) => session.id === updated.sessionId ? { ...session, status: next.filter((item) => item.sessionId === updated.sessionId).every((item) => item.status === "completed") ? "completed" : "active" } : session));
        return next;
      });
      setStatus("saved");
    } catch { setStatus("offline"); } finally { setSavingId(null); }
  };

  const actorEyebrow = actorRole === "admin" ? ["Administration du plan", "Plan administration"] : actorRole === "family" ? ["Plan partagé avec Salah", "Plan shared with Salah"] : ["Votre espace de récupération", "Your recovery space"];

  const fr = language === "fr";
  const plannedMinutes = recommended.reduce((sum, item) => sum + item.durationMinutes, 0);
  const studioTimes = [
    { value: 5, icon: "☕", fr: "Une pause", en: "A short break" },
    { value: 10, icon: "🕐", fr: "Un bon moment", en: "A good moment" },
    { value: 15, icon: "🎯", fr: "Une vraie séance", en: "A full session" },
    { value: 20, icon: "🌟", fr: "En pleine forme", en: "Feeling great" },
  ];
  const studioEnergies = [
    { effort: 2, complexity: 2, icon: "🌱", fr: "En douceur", en: "Gently", subFr: "Activités calmes et familières", subEn: "Calm, familiar activities" },
    { effort: 3, complexity: 3, icon: "🙂", fr: "Prêt à pratiquer", en: "Ready to practise", subFr: "Un bon équilibre", subEn: "A good balance" },
    { effort: 4, complexity: 4, icon: "💪", fr: "Plein d’énergie", en: "Full of energy", subFr: "Un défi stimulant", subEn: "A motivating challenge" },
  ];
  const studioFocuses = [
    { value: "communication" as const, icon: "💬", fr: "Parler", en: "Speak", subFr: "Mots, phrases et conversation", subEn: "Words, phrases, conversation" },
    { value: "mobility" as const, icon: "🚶", fr: "Bouger", en: "Move", subFr: "Force et équilibre", subEn: "Strength and balance" },
    { value: "all" as const, icon: "🌀", fr: "Un peu des deux", en: "A bit of both", subFr: "Séance variée", subEn: "A varied session" },
  ];
  const studioQuestion = studioStage === "time" ? (fr ? "Combien de temps avez-vous?" : "How much time do you have?")
    : studioStage === "energy" ? (fr ? "Comment vous sentez-vous?" : "How are you feeling?")
    : studioStage === "focus" ? (fr ? "Sur quoi voulez-vous travailler?" : "What would you like to work on?")
    : (fr ? "Votre séance sur mesure est prête!" : "Your custom session is ready!");

  const plannedBlock = <section id="planned-exercises" className="planned-exercises"><div className="plan-section-heading"><div><p className="eyebrow">{fr ? "Prêtes à compléter" : "Ready to complete"}</p><h3>{fr ? "Exercices dans mon plan" : "Exercises in my plan"}</h3></div><button className="plan-add-inline" onClick={() => openEditor("exercise")}>+ {fr ? "Entrée manuelle" : "Manual entry"}</button></div><div className="plan-entry-list">{visibleEntries.length ? visibleEntries.map((entry) => <PlanEntryCard key={entry.id} entry={entry} language={language} saving={savingId === entry.id} onToggle={() => toggleEntry(entry)} />) : <EmptyPlan language={language} onAdd={() => openEditor("exercise")} />}</div></section>;

  const libraryInner = <>
    <LibraryFilters language={language} domain={libraryDomain} setDomain={setLibraryDomain} effort={libraryEffort} setEffort={setLibraryEffort} complexity={libraryComplexity} setComplexity={setLibraryComplexity} duration={libraryDuration} setDuration={setLibraryDuration} search={librarySearch} setSearch={setLibrarySearch} resultCount={filteredLibrary.length} />
    <div className="exercise-library-grid">{filteredLibrary.slice(0, visibleCount).map((item) => <ExerciseCard key={item.id} item={item} language={language} alreadyAdded={entries.some((entry) => entry.exerciseLibraryId === item.id && entry.status === "active")} saving={savingId === item.id} onAdd={() => addEntry({ templateId: item.id }, item.id)} />)}</div>
    {!filteredLibrary.length && <div className="plan-empty card-surface"><span>⌕</span><h3>{fr ? "Aucun exercice avec ces filtres" : "No exercises match these filters"}</h3><p>{fr ? "Augmentez le temps, l’effort ou la complexité pour élargir la sélection." : "Increase time, effort, or complexity to broaden the selection."}</p></div>}
    {visibleCount < filteredLibrary.length && <button className="load-more" onClick={() => setVisibleCount((count) => count + 12)}>{fr ? `Voir 12 exercices de plus (${filteredLibrary.length - visibleCount} restants)` : `Show 12 more exercises (${filteredLibrary.length - visibleCount} remaining)`}</button>}
  </>;

  if (activeGuidedSession) return <GuidedSession
    key={activeGuidedSession.id}
    language={language}
    session={activeGuidedSession}
    onEntryComplete={completeGuidedEntry}
    onSessionComplete={completeGuidedSession}
    onExit={() => setActiveGuidedSession(null)}
    onOpenReplacement={(replacement) => setActiveGuidedSession(replacement)}
  />;

  return <section className="plan-workspace">
    <div className="plan-title-row">
      <div><p className="eyebrow">{actorEyebrow[language === "fr" ? 0 : 1]}</p><h2>{language === "fr" ? "Mon plan" : "My plan"}</h2><p>{language === "fr" ? "Un seul endroit pour choisir une séance, voir ce qui vient et reconnaître chaque progrès." : "One place to choose a session, see what is next, and recognize every step forward."}</p></div>
      <div className="plan-title-actions"><span className={`data-status ${status}`}><i />{status === "loading" ? (language === "fr" ? "Chargement" : "Loading") : status === "saved" ? (language === "fr" ? "Plan synchronisé" : "Plan synced") : (language === "fr" ? "Mode hors ligne" : "Offline mode")}</span><button className="portal-primary" onClick={() => openEditor()}>+ {language === "fr" ? "Ajouter au plan" : "Add to plan"}</button></div>
    </div>

    <nav className="plan-tabs" aria-label={language === "fr" ? "Sections de mon plan" : "My plan sections"}>
      {tabs.map((tab) => <button key={tab.id} className={selectedTab === tab.id ? "selected" : ""} onClick={() => setSelectedTab(tab.id)}><span>{tab.mark}</span>{tabLabel(tab.id, language)}<small>{tab.category ? entries.filter((entry) => entry.category === tab.category && entry.status === "active").length : entries.filter((entry) => entry.status === "active").length}</small></button>)}
    </nav>

    <div className="view-enter" key={selectedTab}>
    {selectedTab === "overview" && <>
      <div className="plan-momentum-grid">
        <article className="momentum-card"><div className="momentum-copy"><p className="eyebrow">{language === "fr" ? "Évolution personnelle" : "Personal evolution"}</p><h3>{language === "fr" ? "Votre élan prend forme" : "Your momentum is taking shape"}</h3><p>{language === "fr" ? "Les pauses ne retirent jamais de progrès. Chaque action terminée ajoute un repère à votre propre parcours." : "Rest never removes progress. Each completed action adds a marker to your own journey."}</p></div><div className="momentum-orbit" aria-label={`${momentum} points`}><strong>{momentum}</strong><span>{language === "fr" ? "points d’élan" : "momentum points"}</span></div><div className="level-track"><span style={{ width: `${levelProgress}%` }} /></div><div className="level-copy"><b>{language === "fr" ? `Niveau ${level} · capacité en construction` : `Level ${level} · capacity in progress`}</b><small>{100 - levelProgress} {language === "fr" ? "points avant le prochain repère" : "points to the next marker"}</small></div></article>
        <article className="evolution-card card-surface"><p className="eyebrow">{language === "fr" ? "4 dernières semaines" : "Last 4 weeks"}</p><h3>{language === "fr" ? "Moins d’aide, plus de choix" : "Less help, more choice"}</h3><div className="evolution-bars" aria-label={language === "fr" ? "Tendance de progression" : "Progress trend"}>{[34, 46, 59, Math.min(86, 66 + completed.length * 4)].map((value, index) => <div key={index}><span style={{ height: `${value}%` }} className={index === 3 ? "current" : ""}><b>{value}%</b></span><small>S{index + 1}</small></div>)}</div><p>{language === "fr" ? "Tendance descriptive — à interpréter avec l’équipe, jamais comme un score clinique." : "Descriptive trend—interpret with the care team, never as a clinical score."}</p></article>
      </div>
      {sessions.length > 0 && <SessionList sessions={sessions.slice(0, 2)} entries={entries} language={language} onOpen={openSession} />}
      <div className="plan-domain-grid">{(["appointment", "todo", "diet", "exercise"] as PlanCategory[]).map((category, index) => { const total = entries.filter((entry) => entry.category === category).length; const done = entries.filter((entry) => entry.category === category && entry.status === "completed").length; return <button key={category} onClick={() => setSelectedTab(tabs[index + 1].id)}><span>{["R", "✓", "D", "E"][index]}</span><b>{categoryLabel(category, language)}</b><small>{done}/{total} {language === "fr" ? "complétés" : "completed"}</small><i><em style={{ width: `${total ? Math.round(done / total * 100) : 0}%` }} /></i></button>; })}</div>
    </>}

    {selectedTab === "diet" && <div className="plan-safety-note"><span>!</span><div><b>{language === "fr" ? "L’alimentation ne remplace jamais un plan de déglutition." : "Food planning never replaces a swallowing plan."}</b><p>{language === "fr" ? "Élan ne modifie ni textures, ni liquides, ni restrictions. Ces décisions exigent une évaluation et un plan individualisé de votre orthophoniste ou diététiste." : "Élan never changes textures, fluids, or restrictions. Those decisions require assessment and an individualized plan from your speech-language pathologist or dietitian."}</p><a href="https://www.strokebestpractices.ca/recommendations/stroke-rehabilitation-delivery/6-swallowing-nutrition-and-oral-care" target="_blank" rel="noreferrer">{language === "fr" ? "Recommandations canadiennes ↗" : "Canadian recommendations ↗"}</a></div></div>}

    {selectedTab === "exercises" ? (actorRole === "patient" ? <>
      <section className="studio-momentum card-surface">
        <LevelRing level={level} progress={levelProgress} label={fr ? "niveau" : "level"} />
        <div className="studio-momentum-copy">
          <p className="eyebrow">{fr ? "Mon élan" : "My momentum"}</p>
          <h3>{momentum} {fr ? "points d’élan" : "momentum points"}</h3>
          <p>{100 - levelProgress} {fr ? "points avant le prochain niveau. Chaque activité compte — le repos ne retire jamais rien." : "points to the next level. Every activity counts — rest never takes anything away."}</p>
        </div>
        <div className="studio-momentum-badges">
          <span><b>{completed.length}</b><small>{fr ? "activités réussies" : "activities done"}</small></span>
          <span><b>{sessions.filter((session) => session.status === "completed").length}</b><small>{fr ? "séances terminées" : "sessions finished"}</small></span>
        </div>
      </section>

      <SessionList sessions={sessions} entries={entries} language={language} onOpen={openSession} />

      <section className="studio-wizard card-surface" aria-labelledby="studio-question">
        <div className="studio-wizard-head">
          <div>
            <p className="eyebrow">{fr ? "Créer ma séance" : "Build my session"}</p>
            <h3 id="studio-question">{studioQuestion}</h3>
            <p className="studio-note">{fr ? "🧍 Séance en solo — toutes ces activités sont conçues pour être faites seul, en sécurité." : "🧍 Solo session — all of these activities are designed to be done safely on your own."}</p>
          </div>
          <div className="studio-stage-dots" aria-hidden="true">
            {(["time", "energy", "focus"] as const).map((stage, index) => <span key={stage} className={studioStage === stage ? "current" : (studioStage === "preview" || index < ["time", "energy", "focus"].indexOf(studioStage)) ? "done" : ""}>{index + 1}</span>)}
          </div>
        </div>
        <div className="view-enter" key={studioStage}>
          {studioStage === "time" && <div className="studio-options">
            {studioTimes.map((option) => <button key={option.value} className={sessionDuration === option.value ? "studio-option selected" : "studio-option"} onClick={() => { setSessionDuration(option.value); setStudioStage("energy"); }}>
              <span className="studio-option-icon" aria-hidden="true">{option.icon}</span>
              <b>{option.value} min</b>
              <small>{fr ? option.fr : option.en}</small>
            </button>)}
          </div>}
          {studioStage === "energy" && <>
            <div className="studio-options three">
              {studioEnergies.map((option) => <button key={option.effort} className={sessionEffort === option.effort ? "studio-option selected" : "studio-option"} onClick={() => { setSessionEffort(option.effort); setSessionComplexity(option.complexity); setStudioStage("focus"); }}>
                <span className="studio-option-icon" aria-hidden="true">{option.icon}</span>
                <b>{fr ? option.fr : option.en}</b>
                <small>{fr ? option.subFr : option.subEn}</small>
              </button>)}
            </div>
            <button className="studio-back" onClick={() => setStudioStage("time")}>← {fr ? "Le temps" : "Time"}</button>
          </>}
          {studioStage === "focus" && <>
            <div className="studio-options three">
              {studioFocuses.map((option) => <button key={option.value} className={sessionDomain === option.value ? "studio-option selected" : "studio-option"} onClick={() => { setSessionDomain(option.value); setVariation(0); setStudioStage("preview"); }}>
                <span className="studio-option-icon" aria-hidden="true">{option.icon}</span>
                <b>{fr ? option.fr : option.en}</b>
                <small>{fr ? option.subFr : option.subEn}</small>
              </button>)}
            </div>
            <button className="studio-back" onClick={() => setStudioStage("energy")}>← {fr ? "L’énergie" : "Energy"}</button>
          </>}
          {studioStage === "preview" && <div className="studio-preview">
            <ol className="studio-preview-list">
              {recommended.map((item, index) => <li key={item.id} style={{ animationDelay: `${index * 60}ms` }}>
                <span aria-hidden="true">{themeIcon(item.theme, item.domain)}</span>
                <div><b>{fr ? item.titleFr : item.titleEn}</b><small>{item.durationMinutes} min · {stageEmoji[item.stage]} {stageLabel(item.stage, language)}</small></div>
              </li>)}
            </ol>
            {!recommended.length && <p className="builder-empty">{fr ? "Aucune activité ne correspond. Essayez plus de temps ou plus d’énergie." : "Nothing fits yet. Try more time or more energy."}</p>}
            {recommended.length > 0 && <div className="studio-preview-facts">
              <span><b>{plannedMinutes} min</b><small>{fr ? "au total" : "in total"}</small></span>
              <span><b>{recommended.length}</b><small>{fr ? "activités" : "activities"}</small></span>
              <span className="points"><b>+{recommended.length * 20}</b><small>{fr ? "points d’élan" : "momentum points"}</small></span>
            </div>}
            <div className="studio-actions">
              <button className="portal-primary studio-go" disabled={!recommended.length || savingId === "session"} onClick={createSession}>{savingId === "session" ? (fr ? "Création…" : "Building…") : (fr ? "C’est parti! →" : "Let’s go! →")}</button>
              <button className="studio-shuffle" onClick={() => setVariation((value) => value + 1)}>🔀 {fr ? "Une autre idée" : "Another idea"}</button>
              <button className="studio-back" onClick={() => setStudioStage("time")}>← {fr ? "Modifier mes choix" : "Change my answers"}</button>
            </div>
          </div>}
        </div>
      </section>

      {plannedBlock}

      <section className="curated-library studio-explore">
        <button className="studio-library-toggle" onClick={() => setLibraryOpen((open) => !open)} aria-expanded={libraryOpen}>
          <span aria-hidden="true">🧭</span>
          <span><b>{fr ? "Explorer toutes les activités" : "Explore every activity"}</b><small>{roleLibrary.length} {fr ? "activités à faire seul, en sécurité" : "activities safe to do on your own"}</small></span>
          <i aria-hidden="true">{libraryOpen ? "▴" : "▾"}</i>
        </button>
        {libraryOpen && <div className="view-enter">{libraryInner}</div>}
      </section>
    </> : <>
      <SessionBuilder language={language} libraryCount={roleLibrary.length} note={actorRole === "family" ? (fr ? "Séances à faire à deux : chaque activité prévoit la présence d’un partenaire." : "Sessions for two: every activity assumes a partner is present.") : undefined} domain={sessionDomain} setDomain={setSessionDomain} duration={sessionDuration} setDuration={setSessionDuration} effort={sessionEffort} setEffort={setSessionEffort} complexity={sessionComplexity} setComplexity={setSessionComplexity} recommended={recommended} saving={savingId === "session"} onCreate={createSession} />
      <div id="active-sessions"><SessionList sessions={sessions} entries={entries} language={language} onOpen={openSession} /></div>
      {plannedBlock}
      <section className="curated-library">
        <div className="curated-heading"><div><p className="eyebrow">{language === "fr" ? "Bibliothèque complète" : "Complete library"}</p><h3>{language === "fr" ? "Choisir par temps, effort et complexité" : "Choose by time, effort, and complexity"}</h3><p>{language === "fr" ? "Le temps inclut les pauses. L’effort est votre préférence pour la séance; il ne modifie jamais la dose, l’aide ou les répétitions prescrites." : "Time includes rests. Effort is your session preference; it never changes prescribed dose, assistance, or repetitions."}</p></div><span>{roleLibrary.length} {language === "fr" ? "exercices" : "exercises"}</span></div>
        {libraryInner}
      </section>
    </>) : <>
      <div className="plan-section-heading"><div><p className="eyebrow">{selectedTab === "overview" ? (language === "fr" ? "À venir" : "Coming up") : categoryLabel(tabs.find((tab) => tab.id === selectedTab)?.category ?? "todo", language)}</p><h3>{selectedTab === "overview" ? (language === "fr" ? "Les prochains repères" : "Your next markers") : tabLabel(selectedTab, language)}</h3></div>{selectedTab !== "overview" && <button className="plan-add-inline" onClick={() => openEditor()}>+ {language === "fr" ? "Nouvelle entrée" : "New entry"}</button>}</div>
      <div className="plan-entry-list">{visibleEntries.length ? visibleEntries.map((entry) => <PlanEntryCard key={entry.id} entry={entry} language={language} saving={savingId === entry.id} onToggle={() => toggleEntry(entry)} />) : <EmptyPlan language={language} onAdd={() => openEditor()} />}</div>
    </>}
    </div>

    {editorOpen && <PlanEditor language={language} category={editorCategory} actorRole={actorRole} saving={savingId === "manual"} onClose={() => setEditorOpen(false)} onSave={(payload) => addEntry(payload)} />}
  </section>;
}

function SessionBuilder({ language, libraryCount, note, domain, setDomain, duration, setDuration, effort, setEffort, complexity, setComplexity, recommended, saving, onCreate }: { language: Language; libraryCount: number; note?: string; domain: "all" | "communication" | "mobility"; setDomain: (value: "all" | "communication" | "mobility") => void; duration: number; setDuration: (value: number) => void; effort: number; setEffort: (value: number) => void; complexity: number; setComplexity: (value: number) => void; recommended: ExerciseTemplate[]; saving: boolean; onCreate: () => void }) {
  const planned = recommended.reduce((sum, item) => sum + item.durationMinutes, 0);
  return <section className="session-builder">
    <div className="session-builder-intro"><div><p className="eyebrow">{language === "fr" ? "Créer ma séance" : "Build my session"}</p><h3>{language === "fr" ? "De quoi avez-vous envie aujourd’hui?" : "What feels right today?"}</h3><p>{language === "fr" ? `${libraryCount} activités cliniquement balisées sont prêtes. Élan compose une séance; vous gardez toujours le droit de faire une pause.` : `${libraryCount} clinically bounded activities are ready. Élan builds a session; you always have permission to pause.`}</p>{note && <p className="builder-note">🤝 {note}</p>}</div><span className="session-builder-mark">{recommended.length || "—"}<small>{language === "fr" ? "activités" : "activities"}</small></span></div>
    <div className="builder-controls">
      <label>{language === "fr" ? "Domaine" : "Focus"}<select value={domain} onChange={(event) => setDomain(event.target.value as typeof domain)}><option value="all">{language === "fr" ? "Mixte" : "Mixed"}</option><option value="communication">Communication</option><option value="mobility">{language === "fr" ? "Mobilité" : "Mobility"}</option></select></label>
      <label>{language === "fr" ? "Temps disponible" : "Available time"}<div className="segmented-control">{[5, 10, 15, 20, 30].map((value) => <button type="button" className={duration === value ? "selected" : ""} onClick={() => setDuration(value)} key={value}>{value}<small>min</small></button>)}</div></label>
      <label>{language === "fr" ? "Effort souhaité" : "Preferred effort"}<input type="range" min="1" max="5" value={effort} onChange={(event) => setEffort(Number(event.target.value))} /><span className="range-value">{effort}/5 · {language === "fr" ? ["très doux", "doux", "modéré", "soutenu", "élevé"][effort - 1] : ["very light", "light", "moderate", "strong", "high"][effort - 1]}</span></label>
      <label>{language === "fr" ? "Complexité maximale" : "Maximum complexity"}<input type="range" min="1" max="5" value={complexity} onChange={(event) => setComplexity(Number(event.target.value))} /><span className="range-value">{complexity}/5 · {complexity <= 2 ? (language === "fr" ? "fondations" : "foundation") : complexity <= 3 ? (language === "fr" ? "progression" : "build") : (language === "fr" ? "défi" : "challenge")}</span></label>
    </div>
    <div className="session-preview"><div><b>{language === "fr" ? "Votre sélection" : "Your selection"}</b><span>{planned} min · {recommended.length} {language === "fr" ? "activités" : "activities"}</span></div><ol>{recommended.map((item) => <li key={item.id}><span aria-hidden="true">{themeIcon(item.theme, item.domain)}</span><div><b>{language === "fr" ? item.titleFr : item.titleEn}</b><small>{item.durationMinutes} min · {stageEmoji[item.stage]} {stageLabel(item.stage, language)}</small></div></li>)}</ol>{!recommended.length && <p className="builder-empty">{language === "fr" ? "Aucune combinaison avec ces limites. Augmentez l’effort, la complexité ou le temps." : "No combination fits these limits. Increase effort, complexity, or time."}</p>}<button className="portal-primary create-session-button" disabled={!recommended.length || saving} onClick={onCreate}>{saving ? (language === "fr" ? "Création…" : "Building…") : (language === "fr" ? "Créer cette séance →" : "Build this session →")}</button></div>
    <p className="dose-disclaimer">{language === "fr" ? "Important: ces réglages servent à choisir le contenu. Ils ne changent jamais l’aide, l’appui, les répétitions ou la dose clinique inscrits à votre plan." : "Important: these controls select content. They never change the assistance, support, repetitions, or clinical dose written in your plan."}</p>
  </section>;
}

function SessionList({ sessions, entries, language, onOpen }: { sessions: PlanSession[]; entries: PlanEntry[]; language: Language; onOpen: (session: PlanSession) => void }) {
  if (!sessions.length) return null;
  return <section className="active-session-list"><div className="plan-section-heading"><div><p className="eyebrow">{language === "fr" ? "Parcours en cours" : "Active pathway"}</p><h3>{language === "fr" ? "Mes séances" : "My sessions"}</h3></div></div><div className="session-list-grid">{sessions.map((session) => { const items = entries.filter((entry) => entry.sessionId === session.id); const done = items.filter((entry) => entry.status === "completed").length; const progress = items.length ? Math.round(done / items.length * 100) : 0; return <article className={`session-summary-card card-surface ${session.status}`} key={session.id}><div className="session-summary-top"><span>{session.status === "completed" ? "✓" : `${done}/${items.length}`}</span><div><p className="eyebrow">{session.status === "completed" ? (language === "fr" ? "Séance accomplie" : "Session complete") : (language === "fr" ? "Séance active" : "Active session")}</p><h4>{language === "fr" ? session.titleFr : session.titleEn}</h4></div></div><div className="session-progress"><i style={{ width: `${progress}%` }} /></div><p>{progress}% · {session.targetDuration} min · {language === "fr" ? "effort" : "effort"} {session.effortLevel}/5</p><button onClick={() => onOpen(session)}>{session.status === "completed" ? (language === "fr" ? "Voir le résumé" : "View summary") : (language === "fr" ? "Continuer la séance →" : "Continue session →")}</button></article>; })}</div></section>;
}

function LibraryFilters({ language, domain, setDomain, effort, setEffort, complexity, setComplexity, duration, setDuration, search, setSearch, resultCount }: { language: Language; domain: "all" | "communication" | "mobility"; setDomain: (value: "all" | "communication" | "mobility") => void; effort: number; setEffort: (value: number) => void; complexity: number; setComplexity: (value: number) => void; duration: number; setDuration: (value: number) => void; search: string; setSearch: (value: string) => void; resultCount: number }) {
  return <div className="library-filters"><label className="library-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === "fr" ? "Rechercher un thème ou une activité" : "Search a theme or activity"} /></label><label>{language === "fr" ? "Domaine" : "Focus"}<select value={domain} onChange={(event) => setDomain(event.target.value as typeof domain)}><option value="all">{language === "fr" ? "Tous" : "All"}</option><option value="communication">Communication</option><option value="mobility">{language === "fr" ? "Mobilité" : "Mobility"}</option></select></label><label>{language === "fr" ? "Effort max." : "Max effort"}<select value={effort} onChange={(event) => setEffort(Number(event.target.value))}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}/5</option>)}</select></label><label>{language === "fr" ? "Complexité max." : "Max complexity"}<select value={complexity} onChange={(event) => setComplexity(Number(event.target.value))}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}/5</option>)}</select></label><label>{language === "fr" ? "Durée max." : "Max duration"}<select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{[5, 10, 15, 20].map((value) => <option key={value} value={value}>{value} min</option>)}</select></label><span className="filter-count">{resultCount} {language === "fr" ? "résultats" : "results"}</span></div>;
}

function ExerciseCard({ item, language, alreadyAdded, saving, onAdd }: { item: ExerciseTemplate; language: Language; alreadyAdded: boolean; saving: boolean; onAdd: () => void }) {
  return <article className="exercise-research-card card-surface"><div className="exercise-card-top"><span className={`exercise-domain ${item.domain}`}>{item.domain === "communication" ? "Communication" : (language === "fr" ? "Physiothérapie" : "Physiotherapy")}</span><span className={`safety-chip ${item.safetyClass}`}>{safetyLabel(item.safetyClass, language)}</span><span className={item.requiresPartner ? "partner-chip partner" : "partner-chip solo"}>{item.requiresPartner ? (language === "fr" ? "🤝 À deux" : "🤝 With a partner") : (language === "fr" ? "🧍 En solo" : "🧍 Solo")}</span>{item.evidenceUrl && <details className="info-disclosure"><summary aria-label={language === "fr" ? "Source clinique" : "Clinical source"}><span aria-hidden="true">i</span></summary><div><small>{language === "fr" ? "Étude ou recommandation" : "Study or guideline"}</small><a href={item.evidenceUrl} target="_blank" rel="noreferrer">{item.evidenceTitle} ↗</a></div></details>}</div><div className="exercise-metrics"><span>◷ {item.durationMinutes} min</span><EffortDots value={item.effortLevel} label={language === "fr" ? "Effort" : "Effort"} /><span>{stageEmoji[item.stage]} {stageLabel(item.stage, language)} {item.difficulty}/5</span></div><h3><span className="exercise-theme" aria-hidden="true">{themeIcon(item.theme, item.domain)}</span>{language === "fr" ? item.titleFr : item.titleEn}</h3><p>{language === "fr" ? item.summaryFr : item.summaryEn}</p><details><summary>{language === "fr" ? "Voir le déroulement et l’aide" : "View instructions and support"}</summary><p>{language === "fr" ? item.instructionsFr : item.instructionsEn}</p><div className="exercise-assistance"><b>{language === "fr" ? "Assistance" : "Assistance"}</b><span>{language === "fr" ? item.assistanceFr : item.assistanceEn}</span></div><div className="exercise-assistance"><b>{language === "fr" ? "Matériel" : "Equipment"}</b><span>{language === "fr" ? item.equipmentFr : item.equipmentEn}</span></div></details><button className="exercise-add-button" disabled={alreadyAdded || saving} onClick={onAdd}>{saving ? (language === "fr" ? "Ajout…" : "Adding…") : alreadyAdded ? (language === "fr" ? "✓ Dans mon plan" : "✓ In my plan") : (language === "fr" ? "+ Ajouter à mon plan" : "+ Add to my plan")}</button></article>;
}

function PlanEntryCard({ entry, language, saving, onToggle }: { entry: PlanEntry; language: Language; saving: boolean; onToggle: () => void }) {
  const date = entry.scheduledAt ? new Date(entry.scheduledAt) : null;
  return <article className={`plan-entry-card card-surface ${entry.status}`}><button className="plan-check" onClick={onToggle} disabled={saving} aria-label={entry.status === "completed" ? (language === "fr" ? "Marquer comme active" : "Mark active") : (language === "fr" ? "Marquer comme terminée" : "Mark complete")}>{entry.status === "completed" ? "✓" : ""}</button><div className="plan-entry-body"><div className="plan-entry-meta"><span className={`category-tag ${entry.category}`}>{categoryLabel(entry.category, language)}</span>{entry.sessionId && <span>{language === "fr" ? "Dans une séance" : "In a session"}</span>}{date && <time>{date.toLocaleString(language === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium", timeStyle: "short" })}</time>}<span>{entry.source === "curated" ? (language === "fr" ? "Contenu validé" : "Curated") : (language === "fr" ? "Ajout manuel" : "Manual")}</span></div><h3>{language === "fr" ? entry.titleFr : entry.titleEn}</h3>{(language === "fr" ? entry.descriptionFr : entry.descriptionEn) && <p>{language === "fr" ? entry.descriptionFr : entry.descriptionEn}</p>}<div className="plan-entry-footer"><span>{language === "fr" ? "Ajouté par" : "Added by"} <b>{entry.createdByName}</b></span>{entry.safetyClass !== "standard" && <span className={`safety-chip ${entry.safetyClass}`}>{safetyLabel(entry.safetyClass, language)}</span>}{entry.evidenceUrl && <details className="info-disclosure up"><summary aria-label={language === "fr" ? "Source clinique" : "Clinical source"}><span aria-hidden="true">i</span></summary><div><small>{language === "fr" ? "Étude ou recommandation" : "Study or guideline"}</small><a href={entry.evidenceUrl} target="_blank" rel="noreferrer">{entry.evidenceTitle ?? (language === "fr" ? "Voir la recherche" : "View research")} ↗</a></div></details>}</div></div><div className="plan-points">{entry.status === "completed" ? "✓" : `+${entry.points}`}<small>{entry.status === "completed" ? (language === "fr" ? "accompli" : "complete") : (language === "fr" ? "élan" : "momentum")}</small></div></article>;
}

function EmptyPlan({ language, onAdd }: { language: Language; onAdd: () => void }) {
  return <div className="plan-empty card-surface"><span>◇</span><h3>{language === "fr" ? "Cet espace est prêt." : "This space is ready."}</h3><p>{language === "fr" ? "Ajoutez une entrée manuellement ou choisissez du contenu validé." : "Add an entry manually or choose validated content."}</p><button onClick={onAdd}>{language === "fr" ? "Ajouter maintenant" : "Add now"}</button></div>;
}

function PlanEditor({ language, category, actorRole, saving, onClose, onSave }: { language: Language; category: PlanCategory; actorRole: ActorRole; saving: boolean; onClose: () => void; onSave: (payload: Record<string, unknown>) => void }) {
  const [selectedCategory, setSelectedCategory] = useState(category); const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [scheduledAt, setScheduledAt] = useState("");
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const submit = (event: FormEvent) => { event.preventDefault(); if (title.trim()) onSave({ category: selectedCategory, title, description, scheduledAt }); };
  const actorText = actorRole === "admin" ? ["Ajout administrateur", "Admin entry"] : actorRole === "family" ? ["Ajout par un proche", "Family entry"] : ["Ajout personnel", "Personal entry"];
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><form className="plan-editor" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="plan-editor-title"><div className="modal-header"><div><p className="eyebrow">{actorText[language === "fr" ? 0 : 1]}</p><h2 id="plan-editor-title">{language === "fr" ? "Ajouter à mon plan" : "Add to my plan"}</h2></div><button className="close-button" type="button" onClick={onClose} aria-label={language === "fr" ? "Fermer" : "Close"}>×</button></div><label>{language === "fr" ? "Catégorie" : "Category"}<select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value as PlanCategory)}>{(["appointment", "todo", "diet", "exercise"] as PlanCategory[]).map((item) => <option value={item} key={item}>{categoryLabel(item, language)}</option>)}</select></label><label>{language === "fr" ? "Titre" : "Title"}<input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder={language === "fr" ? "Ce que vous voulez ajouter" : "What you want to add"} required /></label><label>{language === "fr" ? "Détails (facultatif)" : "Details (optional)"}<textarea value={description} maxLength={800} onChange={(event) => setDescription(event.target.value)} rows={4} /></label><label>{language === "fr" ? "Date et heure (facultatif)" : "Date and time (optional)"}<input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></label>{selectedCategory === "exercise" && <div className="editor-warning"><b>{language === "fr" ? "Validation protégée" : "Protected review"}</b><span>{language === "fr" ? "Un exercice ajouté manuellement est automatiquement marqué « validation clinique requise »." : "A manually added exercise is automatically marked “clinical approval required.”"}</span></div>}<div className="editor-actions"><button type="button" onClick={onClose}>{language === "fr" ? "Annuler" : "Cancel"}</button><button className="portal-primary" disabled={saving || !title.trim()}>{saving ? (language === "fr" ? "Enregistrement…" : "Saving…") : (language === "fr" ? "Ajouter au plan" : "Add to plan")}</button></div></form></div>;
}
