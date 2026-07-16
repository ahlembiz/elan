"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import MyPlan from "./MyPlan";

type Language = "fr" | "en";
type View = "today" | "communicate" | "practice" | "plan" | "progress" | "privacy";
type SessionStep = "checkin" | "words" | "movement" | "mission" | "complete";
type Role = "patient" | "family" | "admin";
type Theme = "day" | "night";
type TextSize = "standard" | "large";
type BoardThemeId = "essential" | "health" | "feelings" | "food" | "people" | "plans";
type BoardMessage = readonly [fr: string, en: string, symbol: string];
type BoardTheme = { id: BoardThemeId; icon: string; fr: string; en: string; messages: readonly BoardMessage[] };

type ProductData = {
  profile?: { preferredName: string; primaryGoal: string; supervisionSummary: string; nextReviewDate: string };
  goals: Array<{ id: string; domain: string; title: string; progressNote: string; reviewDate: string }>;
  program: Array<{ assignment: { id: string; status: string; orderIndex: number }; exercise: { id: string; domain: string; titleFr: string; titleEn: string; assistanceLevel: string; repetitions: string; clinicianName: string; reviewedAt: string } }>;
  attempts: Array<{ id: number; supportLevel: number; effort: number; confidence: number; completedAt: string }>;
  observations: Array<{ id: number; authorName: string; category: string; note: string; status: string; createdAt: string }>;
  consents: Array<{ id: string; consentType: string; granted: boolean; version: string; updatedAt: string }>;
  mediaAssets: Array<{ id: string; kind: string; contentType: string; sizeBytes: number; durationMs: number | null; recordedBy: string; reviewStatus: string; createdAt: string }>;
};

const fallbackData: ProductData = {
  profile: { preferredName: "Salah", primaryGoal: "Demander ce dont j’ai besoin avec plus d’autonomie", supervisionSummary: "Quelqu’un à proximité pour les transferts et exercices debout", nextReviewDate: "2026-07-16" },
  goals: [
    { id: "communication", domain: "communication", title: "Utiliser une phrase utile avec un seul indice", progressNote: "5 mots personnels demandent moins d’aide", reviewDate: "2026-07-16" },
    { id: "mobility", domain: "mobility", title: "Se lever d’une chaise avec supervision", progressNote: "5 répétitions complétées à effort modéré", reviewDate: "2026-07-18" },
    { id: "participation", domain: "participation", title: "Demander un verre d’eau dans la cuisine", progressNote: "Mission réussie 3 fois cette semaine", reviewDate: "2026-07-20" },
  ],
  program: [], attempts: [], observations: [], consents: [], mediaAssets: [],
};

const copy = {
  fr: {
    today: "Accueil",
    communicate: "Tableau",
    practice: "Mes séances",
    progress: "Progrès",
    help: "Aide",
    greeting: "Bonjour, Salah",
    subtitle: "Voici votre programme pour aujourd’hui.",
    goodMorning: "Aujourd’hui",
    ready: "Prêt à commencer?",
    session: "Votre séance",
    minutes: "Environ 18 minutes",
    start: "Commencer ma séance",
    shorter: "Faire une séance plus courte",
    plan: "Au programme",
    words: "Mes mots importants",
    wordsSub: "3 mots · avec indices",
    movement: "Se lever d’une chaise",
    movementSub: "5 répétitions · accompagné",
    mission: "Mission dans la cuisine",
    missionSub: "Demander un verre d’eau",
    rhythm: "Votre rythme cette semaine",
    rhythmSub: "3 journées de pratique",
    noStreak: "Chaque effort compte. Une journée de repos ne change pas vos progrès.",
    next: "Prochain rendez-vous",
    clinician: "Marie-Claude · Orthophoniste",
    board: "Tableau de communication",
    pause: "Pause",
    quit: "Quitter",
  },
  en: {
    today: "Home",
    communicate: "Board",
    practice: "My sessions",
    progress: "Progress",
    help: "Help",
    greeting: "Hello, Salah",
    subtitle: "Here is your program for today.",
    goodMorning: "Today",
    ready: "Ready to begin?",
    session: "Your session",
    minutes: "About 18 minutes",
    start: "Start my session",
    shorter: "Choose a shorter session",
    plan: "Today’s plan",
    words: "My important words",
    wordsSub: "3 words · cues available",
    movement: "Stand up from a chair",
    movementSub: "5 repetitions · with a helper",
    mission: "Kitchen mission",
    missionSub: "Ask for a glass of water",
    rhythm: "Your rhythm this week",
    rhythmSub: "3 practice days",
    noStreak: "Every effort counts. A rest day does not change your progress.",
    next: "Next appointment",
    clinician: "Marie-Claude · Speech therapist",
    board: "Communication board",
    pause: "Pause",
    quit: "Leave",
  },
};

const boardThemes: readonly BoardTheme[] = [
  { id: "essential", icon: "✓", fr: "Essentiel", en: "Essentials", messages: [
    ["Oui", "Yes", "✓"], ["Non", "No", "×"], ["Je ne sais pas", "I don’t know", "?"], ["Attendez, s’il vous plaît", "Please wait", "…"], ["Répétez, s’il vous plaît", "Please repeat", "↺"],
    ["Je comprends", "I understand", "✓"], ["Je ne comprends pas", "I don’t understand", "?"], ["Montrez-moi", "Show me", "☝"], ["Écrivez-le", "Write it down", "✎"], ["Merci", "Thank you", "♥"],
  ] },
  { id: "health", icon: "+", fr: "Santé", en: "Health", messages: [
    ["J’ai besoin d’aide", "I need help", "+"], ["J’ai mal", "I am in pain", "!"], ["Je suis étourdi", "I feel dizzy", "◎"], ["Je suis essoufflé", "I am short of breath", "≈"], ["Je suis fatigué", "I am tired", "z"],
    ["J’ai chaud", "I am hot", "☀"], ["J’ai froid", "I am cold", "❄"], ["J’ai besoin de mes médicaments", "I need my medication", "+"], ["Appelez l’infirmière", "Call the nurse", "☎"], ["Arrêtons maintenant", "Let’s stop now", "■"],
  ] },
  { id: "feelings", icon: "♥", fr: "Émotions", en: "Feelings", messages: [
    ["Je vais bien", "I feel well", "☺"], ["Je suis calme", "I feel calm", "○"], ["Je suis inquiet", "I am worried", "~"], ["Je suis frustré", "I am frustrated", "!"], ["Je suis triste", "I am sad", "◡"],
    ["Je suis content", "I am happy", "☀"], ["J’ai peur", "I am afraid", "△"], ["J’ai besoin d’une pause", "I need a break", "Ⅱ"], ["Restez avec moi", "Stay with me", "♥"], ["J’aimerais être seul", "I would like privacy", "○"],
  ] },
  { id: "food", icon: "C", fr: "Repas", en: "Food & drink", messages: [
    ["J’ai faim", "I am hungry", "F"], ["J’ai soif", "I am thirsty", "D"], ["Je voudrais de l’eau", "I would like water", "W"], ["Je voudrais du café", "I would like coffee", "C"], ["Encore, s’il vous plaît", "More, please", "+"],
    ["C’est assez", "That is enough", "■"], ["J’aime ça", "I like this", "♥"], ["Je n’aime pas ça", "I don’t like this", "×"], ["Quelle est la texture prescrite?", "What texture is prescribed?", "?"], ["J’ai besoin de temps pour avaler", "I need time to swallow", "…"],
  ] },
  { id: "people", icon: "P", fr: "Personnes et lieux", en: "People & places", messages: [
    ["Je veux voir ma famille", "I want to see my family", "P"], ["Appelez Sylvie", "Call Sylvie", "☎"], ["Où est Salah?", "Where is Salah?", "?"], ["Je veux rentrer à la maison", "I want to go home", "H"], ["Je veux aller dehors", "I want to go outside", "O"],
    ["Je veux aller aux toilettes", "I need the washroom", "T"], ["Où sommes-nous?", "Where are we?", "?"], ["Qui est cette personne?", "Who is this person?", "P"], ["Je veux parler au médecin", "I want to speak with the doctor", "+"], ["Je veux parler en privé", "I want to talk privately", "○"],
  ] },
  { id: "plans", icon: "R", fr: "Temps et projets", en: "Time & plans", messages: [
    ["Quelle heure est-il?", "What time is it?", "◷"], ["Quel jour sommes-nous?", "What day is it?", "D"], ["Qu’est-ce qui est prévu?", "What is planned?", "?"], ["J’ai un rendez-vous", "I have an appointment", "R"], ["Je veux changer le plan", "I want to change the plan", "↺"],
    ["Maintenant", "Now", "N"], ["Plus tard", "Later", "L"], ["Demain", "Tomorrow", "D"], ["Je suis prêt", "I am ready", "✓"], ["Je ne suis pas prêt", "I am not ready", "×"],
  ] },
];

export default function ElanApp({ initialRole, currentName }: { initialRole: Role; currentName: string }) {
  const [language, setLanguage] = useState<Language>("fr");
  const role = initialRole;
  const [theme, setTheme] = useState<Theme>("day");
  const [textSize, setTextSize] = useState<TextSize>("standard");
  const [view, setView] = useState<View>("today");
  const [portalTab, setPortalTab] = useState("overview");
  const [productData, setProductData] = useState<ProductData>(fallbackData);
  const [dataStatus, setDataStatus] = useState<"loading" | "saved" | "offline">("loading");
  const [boardOpen, setBoardOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionStep, setSessionStep] = useState<SessionStep>("checkin");
  const [energy, setEnergy] = useState<number | null>(null);
  const [cue, setCue] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [consentOpen, setConsentOpen] = useState(false);
  const [helper, setHelper] = useState(false);
  const [spoken, setSpoken] = useState<string | null>(null);
  const [boardTheme, setBoardTheme] = useState<BoardThemeId>("essential");
  const [boardSearch, setBoardSearch] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedRef = useRef(0);
  const t = copy[language];

  useEffect(() => {
    fetch("/api/product")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: ProductData) => { setProductData(data); setDataStatus("saved"); })
      .catch(() => setDataStatus("offline"));
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem("elan-text-size");
    const preferred: TextSize = stored === "large" ? "large" : "standard";
    document.documentElement.dataset.textSize = preferred;
    const frame = window.requestAnimationFrame(() => setTextSize(preferred));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem("elan-theme");
    const preferred: Theme = stored === "night" || stored === "day" ? stored : window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day";
    document.documentElement.dataset.theme = preferred;
    const frame = window.requestAnimationFrame(() => setTheme(preferred));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "day" ? "night" : "day";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("elan-theme", nextTheme);
  };

  const toggleTextSize = () => {
    const nextSize: TextSize = textSize === "standard" ? "large" : "standard";
    setTextSize(nextSize);
    document.documentElement.dataset.textSize = nextSize;
    window.localStorage.setItem("elan-text-size", nextSize);
  };

  const nav = useMemo(() => {
    if (role === "family") return [
      { id: "overview", label: language === "fr" ? "Accueil" : "Home", mark: "⌂" },
      { id: "plan", label: language === "fr" ? "Séances" : "Sessions", mark: "▶" },
      { id: "conversations", label: language === "fr" ? "Communiquer" : "Communicate", mark: "••" },
      { id: "observations", label: language === "fr" ? "Notes" : "Notes", mark: "✎" },
      { id: "guidance", label: language === "fr" ? "Conseils" : "Guidance", mark: "?" },
    ];
    if (role === "admin") return [
      { id: "overview", label: language === "fr" ? "Vue d’ensemble" : "Overview", mark: "⌂" },
      { id: "appointments", label: language === "fr" ? "Rendez-vous" : "Appointments", mark: "◷" },
      { id: "todos", label: language === "fr" ? "Tâches" : "To-dos", mark: "✓" },
      { id: "diet", label: language === "fr" ? "Alimentation" : "Diet", mark: "○" },
      { id: "exercises", label: language === "fr" ? "Bibliothèque" : "Library", mark: "▶" },
    ];
    return [
      { id: "today", label: t.today, mark: "⌂" },
      { id: "practice", label: t.practice, mark: "▶" },
      { id: "communicate", label: t.communicate, mark: "••" },
      { id: "plan", label: language === "fr" ? "Mon plan" : "My plan", mark: "☷" },
      { id: "progress", label: t.progress, mark: "↗" },
    ];
  }, [t, role, language]);

  const roleIdentity = role === "patient"
    ? { initials: "SL", name: currentName, detail: language === "fr" ? "Mon profil" : "My profile" }
    : role === "family"
      ? { initials: "SY", name: currentName, detail: language === "fr" ? "Partenaire" : "Partner" }
      : { initials: "ÉA", name: currentName, detail: language === "fr" ? "Administration" : "Administration" };

  const signOut = async () => {
    await fetch("/api/session", { method: "DELETE" });
    window.location.assign("/login");
  };

  const beginSession = () => {
    setSessionStep("checkin");
    setSessionOpen(true);
  };

  const saveSession = async () => {
    try {
      const response = await fetch("/api/product", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "session_complete", supportLevel: cue > 0 ? 3 : 4, effort: energy ?? 3, confidence: 4 }) });
      if (!response.ok) throw new Error();
      const { attempt } = await response.json();
      setProductData((current) => ({ ...current, attempts: [attempt, ...current.attempts] }));
      setDataStatus("saved");
    } catch {
      setDataStatus("offline");
    }
  };

  const voiceConsent = productData.consents.some((consent) => consent.consentType === "voice_recording" && consent.granted);

  const updateConsent = async (granted: boolean) => {
    try {
      const response = await fetch("/api/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consentType: "voice_recording", granted }) });
      if (!response.ok) throw new Error();
      const { consent } = await response.json();
      setProductData((current) => ({ ...current, consents: [consent, ...current.consents.filter((item) => item.consentType !== "voice_recording")] }));
      setDataStatus("saved");
      setConsentOpen(false);
    } catch {
      setDataStatus("offline");
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    if (!voiceConsent) {
      setConsentOpen(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      streamRef.current = stream;
      chunksRef.current = [];
      recordingStartedRef.current = Date.now();
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        const durationMs = Date.now() - recordingStartedRef.current;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        streamRef.current?.getTracks().forEach((track) => track.stop());
        setRecordingStatus("saving");
        const form = new FormData();
        form.append("audio", blob, "elan-recording.webm");
        form.append("assignmentId", "assignment-words");
        form.append("durationMs", String(durationMs));
        try {
          const response = await fetch("/api/media", { method: "POST", body: form });
          if (!response.ok) throw new Error();
          const { asset } = await response.json();
          setProductData((current) => ({ ...current, mediaAssets: [asset, ...current.mediaAssets] }));
          setRecordingStatus("saved");
          setDataStatus("saved");
        } catch {
          setRecordingStatus("error");
        }
      };
      recorder.start();
      setRecordingStatus("idle");
      setRecording(true);
    } catch {
      setRecordingStatus("error");
    }
  };

  const speakMessage = (message: string) => {
    setSpoken(message);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = language === "fr" ? "fr-CA" : "en-CA";
      window.speechSynthesis.speak(utterance);
    }
  };

  const activeBoardTheme = boardThemes.find((themeItem) => themeItem.id === boardTheme) ?? boardThemes[0];
  const boardQuery = boardSearch.trim().toLocaleLowerCase(language === "fr" ? "fr-CA" : "en-CA");
  const boardResults = (boardQuery ? boardThemes.flatMap((themeItem) => themeItem.messages) : activeBoardTheme.messages)
    .filter((message) => !boardQuery || `${message[0]} ${message[1]}`.toLocaleLowerCase(language === "fr" ? "fr-CA" : "en-CA").includes(boardQuery));

  const patientPageTitle = view === "today" ? t.greeting : view === "practice" ? t.practice : view === "communicate" ? (language === "fr" ? "Communiquer" : "Communicate") : view === "plan" ? (language === "fr" ? "Mon plan" : "My plan") : view === "progress" ? (language === "fr" ? "Mes progrès" : "My progress") : (language === "fr" ? "Aide et confidentialité" : "Help and privacy");

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">{language === "fr" ? "Aller au contenu principal" : "Skip to main content"}</a>
      <aside className="side-nav" aria-label={language === "fr" ? "Navigation principale" : "Main navigation"}>
        <button className="brand" onClick={() => { if (role === "patient") setView("today"); else setPortalTab("overview"); setSessionOpen(false); }} aria-label="Élan, accueil">
          <span className="brand-mark">é</span>
          <span>Élan</span>
        </button>
        <nav>
          {nav.map((item) => (
            <button key={item.id} aria-current={(role === "patient" ? view === item.id : portalTab === item.id) ? "page" : undefined} className={(role === "patient" ? view === item.id : portalTab === item.id) ? "nav-item active" : "nav-item"} onClick={() => { setSessionOpen(false); if (role === "patient") { setView(item.id as View); if (item.id === "communicate") setBoardOpen(true); } else setPortalTab(item.id); }}>
              <span className="nav-mark" aria-hidden="true">{item.mark}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button className="profile-pill" onClick={() => { setSessionOpen(false); if (role === "patient") setView("privacy"); else setPortalTab("overview"); }} aria-label={`${roleIdentity.name} — ${roleIdentity.detail}`}>
          <span>{roleIdentity.initials}</span>
          <span className="profile-copy">{roleIdentity.name}<br /><small>{roleIdentity.detail}</small></span>
        </button>
      </aside>

      <main className="main-content" id="main-content" tabIndex={-1}>
        <header className="topbar">
          <div>
            <p className="eyebrow">{role === "patient" ? t.goodMorning : role === "family" ? (language === "fr" ? "Mode partenaire" : "Partner mode") : (language === "fr" ? "Administration du plan" : "Plan administration")}</p>
            <h1>{sessionOpen ? (language === "fr" ? "Ma séance" : "My session") : role === "patient" ? patientPageTitle : role === "family" ? (language === "fr" ? "Bonjour, Sylvie" : "Hello, Sylvie") : (language === "fr" ? "Plan de Salah" : "Salah’s plan")}</h1>
          </div>
          <div className="top-actions">
            <div className="role-session" aria-label={`${language === "fr" ? "Espace" : "Space"}: ${roleIdentity.name}`}><span>{roleIdentity.initials}</span><strong>{roleIdentity.name}</strong></div>
            <div className="language-switch" role="group" aria-label={language === "fr" ? "Choisir la langue" : "Choose language"}>
              <button className={language === "fr" ? "selected" : ""} onClick={() => setLanguage("fr")} aria-pressed={language === "fr"}>FR</button>
              <button className={language === "en" ? "selected" : ""} onClick={() => setLanguage("en")} aria-pressed={language === "en"}>EN</button>
            </div>
            <button className="text-size-button" onClick={toggleTextSize} aria-label={textSize === "standard" ? (language === "fr" ? "Agrandir le texte" : "Make text larger") : (language === "fr" ? "Taille de texte standard" : "Use standard text size")} aria-pressed={textSize === "large"}><span aria-hidden="true">{textSize === "standard" ? "A+" : "A"}</span><small>{textSize === "standard" ? (language === "fr" ? "Agrandir" : "Larger") : (language === "fr" ? "Standard" : "Standard")}</small></button>
            <button className="theme-button" onClick={toggleTheme} aria-label={theme === "day" ? (language === "fr" ? "Activer le thème de nuit" : "Use night theme") : (language === "fr" ? "Activer le thème de jour" : "Use day theme")} aria-pressed={theme === "night"}><span aria-hidden="true">{theme === "day" ? "☾" : "☀"}</span><small>{theme === "day" ? (language === "fr" ? "Nuit" : "Night") : (language === "fr" ? "Jour" : "Day")}</small></button>
            <button className="audio-button" onClick={() => speakMessage(sessionOpen ? (language === "fr" ? "Ma séance" : "My session") : `${t.greeting}. ${t.subtitle}`)} aria-label={language === "fr" ? "Écouter cette page" : "Listen to this page"}>
              <span aria-hidden="true">)))</span>
              {language === "fr" ? "Écouter" : "Listen"}
            </button>
            {role === "patient" && <button className="help-button" onClick={() => { setSessionOpen(false); setView("privacy"); }}><span aria-hidden="true">?</span>{language === "fr" ? "Aide" : "Help"}</button>}
            <button className="sign-out-button" onClick={signOut}>{language === "fr" ? "Quitter" : "Sign out"}</button>
          </div>
        </header>

        {sessionOpen ? (
          <Session
            language={language}
            step={sessionStep}
            setStep={setSessionStep}
            energy={energy}
            setEnergy={setEnergy}
            cue={cue}
            setCue={setCue}
            recording={recording}
            onRecord={toggleRecording}
            recordingStatus={recordingStatus}
            helper={helper}
            setHelper={setHelper}
            onClose={() => setSessionOpen(false)}
            onBoard={() => setBoardOpen(true)}
            onComplete={saveSession}
          />
        ) : role === "family" && portalTab === "plan" ? (
          <MyPlan language={language} initialTab="exercises" actorRole="family" attemptCount={productData.attempts.length} />
        ) : role === "family" ? (
          <FamilyPortal language={language} tab={portalTab} data={productData} dataStatus={dataStatus} setData={setProductData} setDataStatus={setDataStatus} onBoard={() => setBoardOpen(true)} onPlan={() => setPortalTab("plan")} />
        ) : role === "admin" ? (
          <MyPlan key={portalTab} language={language} initialTab={portalTab} actorRole="admin" attemptCount={productData.attempts.length} />
        ) : view === "today" ? (
          <Today language={language} onStart={beginSession} onLibrary={() => setView("practice")} onPlan={() => setView("plan")} onBoard={() => setBoardOpen(true)} onProgress={() => setView("progress")} attemptCount={productData.attempts.length} />
        ) : view === "progress" ? (
          <Progress language={language} />
        ) : view === "practice" ? (
          <MyPlan language={language} initialTab="exercises" actorRole="patient" attemptCount={productData.attempts.length} />
        ) : view === "plan" ? (
          <MyPlan language={language} actorRole="patient" attemptCount={productData.attempts.length} />
        ) : view === "privacy" ? (
          <PrivacyCenter language={language} data={productData} setData={setProductData} onConsent={updateConsent} dataStatus={dataStatus} />
        ) : (
          <SimpleView language={language} view={view} onBoard={() => setBoardOpen(true)} onPlan={() => setView("practice")} />
        )}
      </main>

      {role === "patient" && <button className="quick-board" onClick={() => setBoardOpen(true)}>
        <span aria-hidden="true">•••</span>
        {t.board}
      </button>}

      {boardOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBoardOpen(false); }}>
          <section className="board-modal" role="dialog" aria-modal="true" aria-labelledby="board-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">{language === "fr" ? "Toujours disponible" : "Always available"}</p>
                <h2 id="board-title">{t.board}</h2>
              </div>
              <button className="close-button" onClick={() => setBoardOpen(false)} aria-label={language === "fr" ? "Fermer" : "Close"}>×</button>
            </div>
            <p className="board-instruction">{language === "fr" ? "Choisissez un thème, puis touchez un message pour le faire lire à voix haute." : "Choose a theme, then tap a message to say it aloud."}</p>
            <label className="board-search"><span aria-hidden="true">⌕</span><input value={boardSearch} onChange={(event) => setBoardSearch(event.target.value)} aria-label={language === "fr" ? "Rechercher dans les messages" : "Search messages"} placeholder={language === "fr" ? "Rechercher parmi 60 messages" : "Search 60 messages"} /></label>
            <div className="board-theme-tabs" role="tablist" aria-label={language === "fr" ? "Thèmes du tableau" : "Board themes"}>
              {boardThemes.map((themeItem) => <button key={themeItem.id} role="tab" aria-selected={boardTheme === themeItem.id} className={boardTheme === themeItem.id && !boardQuery ? "selected" : ""} onClick={() => { setBoardTheme(themeItem.id); setBoardSearch(""); }}><span>{themeItem.icon}</span>{language === "fr" ? themeItem.fr : themeItem.en}</button>)}
            </div>
            <div className="message-grid">
              {boardResults.map((message) => {
                const messageText = language === "fr" ? message[0] : message[1];
                return <button key={`${message[0]}-${message[1]}`} className={spoken === messageText ? "message-button spoken" : "message-button"} onClick={() => speakMessage(messageText)}>
                  <span className="message-symbol" aria-hidden="true">{message[2]}</span>
                  {messageText}
                </button>
              })}
            </div>
            {!boardResults.length && <p className="board-no-results">{language === "fr" ? "Aucun message trouvé. Essayez un autre mot." : "No messages found. Try another word."}</p>}
            {spoken && <div className="spoken-bar" aria-live="polite"><span>)))</span> {spoken}</div>}
          </section>
        </div>
      )}

      {consentOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="consent-modal" role="dialog" aria-modal="true" aria-labelledby="consent-title">
            <div className="consent-symbol">●</div>
            <p className="eyebrow">{language === "fr" ? "Votre choix" : "Your choice"}</p>
            <h2 id="consent-title">{language === "fr" ? "Autoriser les enregistrements vocaux?" : "Allow voice recordings?"}</h2>
            <p>{language === "fr" ? "Élan enregistrera votre voix seulement lorsque vous appuyez sur Enregistrer. Les enregistrements servent à vous réécouter et peuvent être révisés par votre orthophoniste autorisée." : "Élan records your voice only when you press Record. Recordings are for playback and may be reviewed by your authorized speech therapist."}</p>
            <div className="consent-facts"><span><b>{language === "fr" ? "Facultatif" : "Optional"}</b><small>{language === "fr" ? "Vous pouvez pratiquer sans enregistrer." : "You can practise without recording."}</small></span><span><b>{language === "fr" ? "Révocable" : "Reversible"}</b><small>{language === "fr" ? "Changez ce choix dans Aide et confidentialité." : "Change this choice in Help and privacy."}</small></span><span><b>{language === "fr" ? "Privé" : "Private"}</b><small>{language === "fr" ? "Aucun usage pour améliorer un modèle." : "Not used for model improvement."}</small></span></div>
            <div className="consent-actions"><button className="secondary-button" onClick={() => { setConsentOpen(false); updateConsent(false); }}>{language === "fr" ? "Non, continuer sans" : "No, continue without"}</button><button className="portal-primary" onClick={() => updateConsent(true)}>{language === "fr" ? "Oui, j’autorise" : "Yes, I consent"}</button></div>
          </section>
        </div>
      )}
    </div>
  );
}

function Today({ language, onStart, onLibrary, onPlan, onBoard, onProgress, attemptCount }: { language: Language; onStart: () => void; onLibrary: () => void; onPlan: () => void; onBoard: () => void; onProgress: () => void; attemptCount: number }) {
  const t = copy[language];
  return <div className="dashboard accessible-home">
    <section className="home-welcome" aria-labelledby="home-question">
      <div className="home-welcome-copy">
        <span className="status-chip"><span className="status-dot" /> {language === "fr" ? "Votre plan est prêt" : "Your plan is ready"}</span>
        <h2 id="home-question">{language === "fr" ? "Que voulez-vous faire aujourd’hui?" : "What would you like to do today?"}</h2>
        <p>{language === "fr" ? "Commencez la séance prévue ou choisissez une activité qui correspond à votre énergie." : "Start the planned session or choose an activity that matches your energy."}</p>
        <button className="home-primary-action" onClick={onStart}><span className="home-action-icon" aria-hidden="true">▶</span><span><b>{t.start}</b><small>{language === "fr" ? "18 minutes · pauses permises" : "18 minutes · breaks are welcome"}</small></span><span className="home-action-arrow" aria-hidden="true">→</span></button>
        <button className="home-secondary-action" onClick={onLibrary}>{language === "fr" ? "Choisir une autre séance" : "Choose another session"}<span aria-hidden="true">→</span></button>
      </div>
      <button className="home-board-callout" onClick={onBoard}>
        <span className="home-board-icon" aria-hidden="true">•••</span>
        <span><small>{language === "fr" ? "Toujours disponible" : "Always available"}</small><b>{language === "fr" ? "J’ai besoin de communiquer" : "I need to communicate"}</b><em>{language === "fr" ? "Ouvrir le tableau de 60 messages" : "Open the 60-message board"}</em></span>
        <span aria-hidden="true">→</span>
      </button>
    </section>

    <section className="home-shortcuts" aria-labelledby="home-shortcuts-title">
      <div className="home-section-heading"><div><p className="eyebrow">{language === "fr" ? "Accès rapide" : "Quick access"}</p><h3 id="home-shortcuts-title">{language === "fr" ? "Retrouvez facilement vos outils" : "Find your tools easily"}</h3></div></div>
      <div className="home-shortcut-grid">
        <button onClick={onLibrary}><span className="shortcut-icon sessions" aria-hidden="true">▶</span><span><b>{language === "fr" ? "Mes séances" : "My sessions"}</b><small>{language === "fr" ? "Choisir par durée et effort" : "Choose by time and effort"}</small></span><span aria-hidden="true">→</span></button>
        <button onClick={onPlan}><span className="shortcut-icon plan" aria-hidden="true">☷</span><span><b>{language === "fr" ? "Mon plan" : "My plan"}</b><small>{language === "fr" ? "Rendez-vous, tâches et alimentation" : "Appointments, to-dos, and diet"}</small></span><span aria-hidden="true">→</span></button>
        <button onClick={onProgress}><span className="shortcut-icon progress" aria-hidden="true">↗</span><span><b>{language === "fr" ? "Mes progrès" : "My progress"}</b><small>{attemptCount ? (language === "fr" ? `${attemptCount} séances enregistrées` : `${attemptCount} sessions recorded`) : (language === "fr" ? "Voir ce qui devient plus facile" : "See what is becoming easier")}</small></span><span aria-hidden="true">→</span></button>
      </div>
    </section>

    <section className="home-details" aria-labelledby="home-plan-title">
      <article className="home-today-card card-surface">
        <div className="home-section-heading"><div><p className="eyebrow">{t.plan}</p><h3 id="home-plan-title">{language === "fr" ? "Votre séance en 3 étapes" : "Your session in 3 steps"}</h3></div><span className="home-duration">18 min</span></div>
        <ol className="home-step-list">
          <li><span>1</span><div><b>{t.words}</b><small>{t.wordsSub}</small></div></li>
          <li><span>2</span><div><b>{t.movement}</b><small>{language === "fr" ? "Avec une personne près de vous" : "With someone nearby"}</small></div></li>
          <li><span>3</span><div><b>{t.mission}</b><small>{t.missionSub}</small></div></li>
        </ol>
        <button className="home-start-again" onClick={onStart}>{t.start}<span aria-hidden="true">→</span></button>
      </article>

      <div className="home-side-stack">
        <button className="home-appointment card-surface" onClick={onPlan}><span className="appointment-date"><strong>16</strong><small>{language === "fr" ? "JUIL." : "JUL."}</small></span><span><small>{t.next}</small><b>10:30 · {t.clinician}</b><em>{language === "fr" ? "Voir dans Mon plan" : "View in My plan"}</em></span><span aria-hidden="true">→</span></button>
        <article className="home-rhythm card-surface"><div><p className="eyebrow">{t.rhythm}</p><h3>{t.rhythmSub}</h3><p>{t.noStreak}</p></div><div className="home-week" aria-label={language === "fr" ? "Trois journées de pratique cette semaine" : "Three practice days this week"}><span className="done">L</span><span className="done">M</span><span className="today-dot">M</span><span>J</span><span>V</span><span>S</span><span>D</span></div></article>
      </div>
    </section>
  </div>;
}

function Session({ language, step, setStep, energy, setEnergy, cue, setCue, recording, onRecord, recordingStatus, helper, setHelper, onClose, onBoard, onComplete }: { language: Language; step: SessionStep; setStep: (step: SessionStep) => void; energy: number | null; setEnergy: (n: number) => void; cue: number; setCue: (n: number) => void; recording: boolean; onRecord: () => void; recordingStatus: "idle" | "saving" | "saved" | "error"; helper: boolean; setHelper: (n: boolean) => void; onClose: () => void; onBoard: () => void; onComplete: () => void }) {
  const [symptom, setSymptom] = useState<"pain" | "dizziness" | null>(null);
  const steps: SessionStep[] = ["checkin", "words", "movement", "mission", "complete"];
  const current = steps.indexOf(step);
  const next = () => setStep(steps[Math.min(current + 1, steps.length - 1)]);
  const previous = () => current === 0 ? onClose() : setStep(steps[current - 1]);
  return <div className="session-layout">
    <div className="session-progress" aria-label={language === "fr" ? `Étape ${current + 1} sur 5` : `Step ${current + 1} of 5`}><span style={{ width: `${(current + 1) * 20}%` }} /></div>
    <div className="session-topline"><button className="back-button" onClick={previous}>← {language === "fr" ? "Retour" : "Back"}</button><span>{current + 1} / 5</span><button className="pause-button" onClick={onClose}>Ⅱ {language === "fr" ? "Mettre en pause" : "Pause"}</button></div>
    <section className="session-card">
      {step === "checkin" && <>
        <p className="eyebrow">{language === "fr" ? "Petit bilan" : "Quick check-in"}</p>
        <h2>{language === "fr" ? "Comment est votre énergie?" : "How is your energy?"}</h2>
        <p>{language === "fr" ? "Choisissez ce qui vous ressemble aujourd’hui." : "Choose what feels right today."}</p>
        <div className="energy-options">
          {[1,2,3,4,5].map(n => <button key={n} className={energy === n ? "energy-button selected" : "energy-button"} onClick={() => setEnergy(n)} aria-pressed={energy === n}><span>{n}</span><small>{n === 1 ? (language === "fr" ? "Très basse" : "Very low") : n === 3 ? (language === "fr" ? "Moyenne" : "Medium") : n === 5 ? (language === "fr" ? "Très bonne" : "Very good") : ""}</small></button>)}
        </div>
        <button className="primary-button session-next" disabled={!energy} onClick={next}>{language === "fr" ? "Continuer" : "Continue"}<span>→</span></button>
      </>}
      {step === "words" && <>
        <p className="eyebrow">{language === "fr" ? "Mes mots importants · 1 sur 3" : "My important words · 1 of 3"}</p>
        <h2>{language === "fr" ? "Dites ce mot à votre façon." : "Say this word in your own way."}</h2>
        <ResearchLink language={language} label={language === "fr" ? "Analyse des caractéristiques sémantiques · revue systématique" : "Semantic Feature Analysis · systematic review"} href="https://pubmed.ncbi.nlm.nih.gov/29710193/" />
        <div className="word-card"><div className="word-object"><span>☕</span></div><strong>{cue >= 2 ? (language === "fr" ? "Café" : "Coffee") : "?"}</strong>{cue >= 1 && <p>{language === "fr" ? "C’est une boisson chaude." : "It is a hot drink."}</p>}{cue >= 3 && <div className="syllables">CA · FÉ</div>}</div>
        <div className="word-actions"><button className="secondary-button" onClick={() => setCue(Math.min(cue + 1, 3))}>+ {language === "fr" ? "Un indice" : "A cue"}</button><button className={recording ? "record-button recording" : "record-button"} onClick={onRecord}><span />{recording ? (language === "fr" ? "Arrêter" : "Stop") : (language === "fr" ? "Enregistrer" : "Record")}</button></div>
        {recordingStatus !== "idle" && <p className={`recording-status ${recordingStatus}`} role="status">{recordingStatus === "saving" ? (language === "fr" ? "Enregistrement sécurisé…" : "Securing recording…") : recordingStatus === "saved" ? (language === "fr" ? "✓ Enregistrement privé sauvegardé." : "✓ Private recording saved.") : (language === "fr" ? "L’enregistrement n’a pas pu être sauvegardé. Vous pouvez continuer sans enregistrer." : "The recording could not be saved. You can continue without recording.")}</p>}
        <p className="reassurance">{language === "fr" ? "Vous pouvez montrer, écrire ou dire le mot. Il n’y a pas d’échec ici." : "You may point, write, or say the word. There is no failure here."}</p>
        <button className="primary-button session-next" onClick={next}>{language === "fr" ? "J’ai terminé" : "I’m done"}<span>→</span></button>
      </>}
      {step === "movement" && <>
        <div className="safety-banner"><strong>!</strong><div><b>{language === "fr" ? "Quelqu’un doit être près de vous" : "Someone must be nearby"}</b><span>{language === "fr" ? "Cette consigne ne peut être modifiée que par votre physiothérapeute." : "Only your physiotherapist can change this instruction."}</span></div></div>
        <p className="eyebrow">{language === "fr" ? "Mouvement · 5 répétitions" : "Movement · 5 repetitions"}</p>
        <h2>{language === "fr" ? "Se lever d’une chaise" : "Stand up from a chair"}</h2>
        <ResearchLink language={language} label={language === "fr" ? "Entraînement assis-debout après un AVC · revue Cochrane" : "Sit-to-stand training after stroke · Cochrane review"} href="https://pubmed.ncbi.nlm.nih.gov/24859467/" />
        <div className="movement-demo"><div className="chair-shape" /><div className="person-shape"><span className="person-head"/><span className="person-body"/></div><span className="demo-label">{language === "fr" ? "Pieds au sol. Penchez-vous vers l’avant." : "Feet on the floor. Lean forward."}</span></div>
        <label className="helper-confirm"><input type="checkbox" checked={helper} onChange={(e) => setHelper(e.target.checked)} /><span className="checkmark">✓</span><span><b>{language === "fr" ? "Mon accompagnateur est prêt" : "My helper is ready"}</b><small>{language === "fr" ? "Il restera près de moi." : "They will stay nearby."}</small></span></label>
        <div className="symptom-row"><span>{language === "fr" ? "Arrêtez si vous avez :" : "Stop if you feel:"}</span><button onClick={() => { setSymptom("pain"); setHelper(false); }}>{language === "fr" ? "Douleur" : "Pain"}</button><button onClick={() => { setSymptom("dizziness"); setHelper(false); }}>{language === "fr" ? "Étourdissement" : "Dizziness"}</button></div>
        {symptom && <div className="symptom-alert" role="alert"><strong>{language === "fr" ? "Séance arrêtée" : "Session stopped"}</strong><p>{language === "fr" ? "Ne poursuivez pas le mouvement. Installez-vous en sécurité avec votre accompagnateur et suivez les consignes de votre équipe. Utilisez les services d’urgence pour tout symptôme urgent ou nouveau." : "Do not continue the movement. Settle safely with your helper and follow your care team’s instructions. Use emergency services for any urgent or new symptom."}</p><button className="secondary-button" onClick={onClose}>{language === "fr" ? "Fermer la séance" : "Close session"}</button></div>}
        <button className="primary-button session-next" disabled={!helper || Boolean(symptom)} onClick={next}>{language === "fr" ? "Commencer le mouvement" : "Start movement"}<span>→</span></button>
      </>}
      {step === "mission" && <>
        <p className="eyebrow">{language === "fr" ? "Mission dans la vraie vie" : "Real-life mission"}</p>
        <h2>{language === "fr" ? "Demandez un verre d’eau." : "Ask for a glass of water."}</h2>
        <div className="mission-phrase"><span>“</span><strong>{language === "fr" ? "Je voudrais un verre d’eau, s’il vous plaît." : "I would like a glass of water, please."}</strong></div>
        <p>{language === "fr" ? "Parlez, montrez la phrase ou utilisez votre tableau. Toutes ces façons de communiquer sont valides." : "Speak, point to the phrase, or use your board. All of these ways to communicate are valid."}</p>
        <ResearchLink language={language} label={language === "fr" ? "Communication fonctionnelle et conversation soutenue · recommandations canadiennes" : "Functional communication and supported conversation · Canadian guidelines"} href="https://www.strokebestpractices.ca/recommendations/stroke-rehabilitation-delivery/7-language-and-communication" />
        <button className="secondary-button wide-button" onClick={onBoard}>{language === "fr" ? "Ouvrir mon tableau de communication" : "Open my communication board"}</button>
        <button className="primary-button session-next" onClick={() => { onComplete(); next(); }}>{language === "fr" ? "Mission terminée" : "Mission complete"}<span>→</span></button>
      </>}
      {step === "complete" && <div className="complete-state"><div className="complete-mark">✓</div><p className="eyebrow">{language === "fr" ? "Séance terminée" : "Session complete"}</p><h2>{language === "fr" ? "Vous avez fait quelque chose d’important aujourd’hui." : "You did something meaningful today."}</h2><p>{language === "fr" ? "Vous avez pratiqué une phrase utile avec moins d’aide. Votre effort est enregistré." : "You practised a useful phrase with less help. Your effort has been saved."}</p><div className="achievement"><span>+1</span><div><b>{language === "fr" ? "Repère ajouté à votre atlas" : "Place added to your atlas"}</b><small>{language === "fr" ? "Vie quotidienne" : "Daily life"}</small></div></div><button className="primary-button" onClick={onClose}>{language === "fr" ? "Retour à aujourd’hui" : "Back to today"}</button></div>}
    </section>
  </div>;
}

function ResearchLink({ language, label, href }: { language: Language; label: string; href: string }) { return <a className="research-pill" href={href} target="_blank" rel="noreferrer"><span>↗</span><small>{language === "fr" ? "Fondé sur la recherche" : "Research-backed"}</small><b>{label}</b></a>; }

function FamilyPortal({ language, tab, data, dataStatus, setData, setDataStatus, onBoard, onPlan }: { language: Language; tab: string; data: ProductData; dataStatus: "loading" | "saved" | "offline"; setData: Dispatch<SetStateAction<ProductData>>; setDataStatus: (status: "loading" | "saved" | "offline") => void; onBoard: () => void; onPlan: () => void }) {
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("communication");
  const [sent, setSent] = useState(false);
  const saveObservation = async () => {
    if (!note.trim()) return;
    setSent(false);
    try {
      const response = await fetch("/api/product", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "observation", authorName: "Sylvie", category, note }) });
      if (!response.ok) throw new Error();
      const { observation } = await response.json();
      setData((current) => ({ ...current, observations: [observation, ...current.observations] }));
      setDataStatus("saved");
      setNote("");
      setSent(true);
    } catch {
      setDataStatus("offline");
    }
  };

  if (tab === "observations") return <section className="portal-page">
    <PortalHeading eyebrow={language === "fr" ? "Partager avec l’équipe" : "Share with the team"} title={language === "fr" ? "Ce que vous avez remarqué" : "What you noticed"} intro={language === "fr" ? "Décrivez un changement concret, sans avoir à l’interpréter cliniquement." : "Describe a concrete change without having to interpret it clinically."} status={dataStatus} language={language} />
    <div className="portal-two-column">
      <div className="observation-form card-surface">
        <label>{language === "fr" ? "Type d’observation" : "Observation type"}<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="communication">{language === "fr" ? "Communication" : "Communication"}</option><option value="mobility">{language === "fr" ? "Mouvement" : "Movement"}</option><option value="participation">{language === "fr" ? "Vie quotidienne" : "Daily life"}</option><option value="fatigue">{language === "fr" ? "Fatigue" : "Fatigue"}</option></select></label>
        <label>{language === "fr" ? "Votre observation" : "Your observation"}<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={language === "fr" ? "Ex. Salah a demandé son café sans que je dise le premier son." : "E.g. Salah asked for coffee without me giving the first sound."} /></label>
        <p className="form-help">{language === "fr" ? "Si Salah présente un nouveau symptôme urgent, utilisez les consignes d’urgence de son équipe plutôt que ce formulaire." : "If Salah has a new urgent symptom, use the care team’s emergency instructions instead of this form."}</p>
        <button className="portal-primary" disabled={!note.trim()} onClick={saveObservation}>{language === "fr" ? "Envoyer à l’équipe" : "Send to care team"}</button>
        {sent && <p className="save-confirmation" role="status">✓ {language === "fr" ? "Observation enregistrée." : "Observation saved."}</p>}
      </div>
      <div className="card-surface compact-list"><h3>{language === "fr" ? "Observations récentes" : "Recent observations"}</h3>{data.observations.length ? data.observations.map((observation) => <div className="observation-row" key={observation.id}><span className={`category-dot ${observation.category}`} /><div><b>{observation.note}</b><small>{observation.authorName} · {observation.status === "new" ? (language === "fr" ? "À réviser" : "To review") : observation.status}</small></div></div>) : <EmptyState text={language === "fr" ? "Aucune observation partagée pour le moment." : "No observations shared yet."} />}</div>
    </div>
  </section>;

  if (tab === "guidance") return <section className="portal-page"><PortalHeading eyebrow={language === "fr" ? "Conversation soutenue" : "Supported conversation"} title={language === "fr" ? "Aider sans prendre la place" : "Help without taking over"} intro={language === "fr" ? "De petits changements peuvent rendre une conversation plus naturelle et plus autonome." : "Small changes can make conversation feel more natural and autonomous."} status={dataStatus} language={language} /><div className="guidance-grid"><GuidanceCard number="01" title={language === "fr" ? "Posez une idée à la fois" : "Offer one idea at a time"} text={language === "fr" ? "Utilisez une phrase courte, puis laissez le temps de répondre." : "Use a short sentence, then leave time to respond."} /><GuidanceCard number="02" title={language === "fr" ? "Attendez dix secondes" : "Wait ten seconds"} text={language === "fr" ? "Le silence peut être du temps de recherche, pas un manque de compréhension." : "Silence may be word-finding time, not lack of understanding."} /><GuidanceCard number="03" title={language === "fr" ? "Confirmez le message" : "Confirm the message"} text={language === "fr" ? "Reformulez ce que vous avez compris sans corriger chaque son." : "Reflect what you understood without correcting every sound."} /></div></section>;

  if (tab === "conversations") return <section className="portal-page"><PortalHeading eyebrow={language === "fr" ? "Moments de connexion" : "Moments of connection"} title={language === "fr" ? "Une conversation, pas un test" : "A conversation, not a test"} intro={language === "fr" ? "Choisissez un sujet adulte et familier. Toutes les façons de répondre sont valides." : "Choose a familiar adult topic. Every way of responding is valid."} status={dataStatus} language={language} /><div className="conversation-feature card-surface"><span className="conversation-number">15</span><div><p className="eyebrow">{language === "fr" ? "Suggestion du jour" : "Today’s suggestion"}</p><h2>{language === "fr" ? "Quel endroit aimerais-tu revisiter?" : "Which place would you like to revisit?"}</h2><p>{language === "fr" ? "Utilisez une photo, une carte, un geste ou quelques mots. Ne cherchez pas la réponse parfaite." : "Use a photo, map, gesture, or a few words. Do not look for a perfect answer."}</p><div className="family-conversation-actions"><button className="portal-primary" onClick={onBoard}>{language === "fr" ? "Commencer avec le tableau" : "Start with the board"}</button><button className="secondary-button" onClick={onPlan}>{language === "fr" ? "Choisir une activité" : "Choose an activity"}</button></div></div></div></section>;

  return <section className="portal-page">
    <PortalHeading eyebrow={language === "fr" ? "Aujourd’hui avec Salah" : "Today with Salah"} title={language === "fr" ? "Votre rôle est clair et simple" : "Your role is clear and simple"} intro={language === "fr" ? "Vous accompagnez le mouvement et offrez le premier indice recommandé — sans transformer la séance en test." : "You support the movement and offer the recommended first cue—without turning the session into a test."} status={dataStatus} language={language} />
    <div className="support-hero">
      <div className="support-focus"><p className="eyebrow">{language === "fr" ? "Objectif du jour" : "Today’s goal"}</p><h2>{language === "fr" ? "Demander un verre d’eau" : "Ask for a glass of water"}</h2><p>{language === "fr" ? "Laissez Salah choisir : parler, montrer la phrase ou ouvrir son tableau." : "Let Salah choose: speak, point to the phrase, or open the board."}</p><div className="cue-callout"><span>1</span><div><b>{language === "fr" ? "Premier indice recommandé" : "Recommended first cue"}</b><p>{language === "fr" ? "Attendez dix secondes, puis demandez : « Est-ce une boisson? »" : "Wait ten seconds, then ask: “Is it a drink?”"}</p></div></div><div className="family-conversation-actions"><button className="portal-primary" onClick={onBoard}>{language === "fr" ? "Ouvrir le tableau" : "Open the board"}</button><button className="secondary-button" onClick={onPlan}>{language === "fr" ? "Voir les séances" : "View sessions"}</button></div></div>
      <div className="safety-panel"><div className="safety-icon">!</div><p className="eyebrow">{language === "fr" ? "Votre présence est requise" : "Your presence is required"}</p><h3>{language === "fr" ? "Se lever d’une chaise" : "Stand up from a chair"}</h3><p>{data.profile?.supervisionSummary}</p><ul><li>{language === "fr" ? "Restez à portée de main." : "Stay within arm’s reach."}</li><li>{language === "fr" ? "Arrêtez en cas de douleur ou d’étourdissement." : "Stop for pain or dizziness."}</li><li>{language === "fr" ? "Ne modifiez pas le nombre de répétitions." : "Do not change the repetitions."}</li></ul></div>
    </div>
  </section>;
}


function PortalHeading({ eyebrow, title, intro, status, language }: { eyebrow: string; title: string; intro: string; status: "loading" | "saved" | "offline"; language: Language }) { return <div className="portal-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{intro}</p></div><span className={`data-status ${status}`}><i />{status === "loading" ? (language === "fr" ? "Chargement" : "Loading") : status === "saved" ? (language === "fr" ? "Données synchronisées" : "Data synced") : (language === "fr" ? "Mode hors ligne" : "Offline mode")}</span></div>; }
function GuidanceCard({ number, title, text }: { number: string; title: string; text: string }) { return <div className="guidance-card"><span>{number}</span><h3>{title}</h3><p>{text}</p></div>; }
function EmptyState({ text }: { text: string }) { return <div className="empty-state"><span>· · ·</span><p>{text}</p></div>; }

function PrivacyCenter({ language, data, setData, onConsent, dataStatus }: { language: Language; data: ProductData; setData: Dispatch<SetStateAction<ProductData>>; onConsent: (granted: boolean) => void; dataStatus: "loading" | "saved" | "offline" }) {
  const voiceConsent = data.consents.some((consent) => consent.consentType === "voice_recording" && consent.granted);
  const visibleRecordings = data.mediaAssets.filter((asset) => asset.reviewStatus !== "deleted");
  const deleteRecording = async (id: string) => {
    const response = await fetch(`/api/media?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) setData((current) => ({ ...current, mediaAssets: current.mediaAssets.map((asset) => asset.id === id ? { ...asset, reviewStatus: "deleted" } : asset) }));
  };
  return <section className="portal-page privacy-page">
    <PortalHeading eyebrow={language === "fr" ? "Aide et confidentialité" : "Help and privacy"} title={language === "fr" ? "Vos choix restent les vôtres" : "Your choices remain yours"} intro={language === "fr" ? "Vous pouvez modifier les autorisations facultatives sans perdre l’accès à vos exercices." : "You can change optional permissions without losing access to your exercises."} status={dataStatus} language={language} />
    <div className="privacy-layout">
      <div className="privacy-consents card-surface"><p className="eyebrow">{language === "fr" ? "Autorisations" : "Permissions"}</p><h3>{language === "fr" ? "Enregistrements vocaux" : "Voice recordings"}</h3><p>{language === "fr" ? "Permet de sauvegarder vos tentatives et de les partager avec votre orthophoniste autorisée." : "Allows your attempts to be saved and shared with your authorized speech therapist."}</p><div className="consent-choice"><span className={voiceConsent ? "consent-on" : "consent-off"}><i />{voiceConsent ? (language === "fr" ? "Autorisé" : "Allowed") : (language === "fr" ? "Non autorisé" : "Not allowed")}</span><button onClick={() => onConsent(!voiceConsent)}>{voiceConsent ? (language === "fr" ? "Retirer l’autorisation" : "Withdraw permission") : (language === "fr" ? "Autoriser" : "Allow")}</button></div><div className="consent-divider" /><h3>{language === "fr" ? "Amélioration des modèles" : "Model improvement"}</h3><p>{language === "fr" ? "Désactivé. Vos enregistrements ne servent pas à entraîner ou améliorer un modèle." : "Off. Your recordings are not used to train or improve a model."}</p><span className="consent-off"><i />{language === "fr" ? "Non autorisé" : "Not allowed"}</span></div>
      <div className="privacy-recordings card-surface"><div className="privacy-list-head"><div><p className="eyebrow">{language === "fr" ? "Vos données" : "Your data"}</p><h3>{language === "fr" ? "Enregistrements sauvegardés" : "Saved recordings"}</h3></div><span>{visibleRecordings.length}</span></div>{visibleRecordings.length ? visibleRecordings.map((asset) => <div className="patient-recording-row" key={asset.id}><audio className="patient-audio" controls preload="none" src={`/api/media?id=${encodeURIComponent(asset.id)}`} aria-label={language === "fr" ? "Écouter votre enregistrement" : "Play your recording"} /><div><b>{language === "fr" ? "Mot personnel · Café" : "Personal word · Coffee"}</b><small>{new Date(asset.createdAt).toLocaleDateString(language === "fr" ? "fr-CA" : "en-CA")} · {asset.durationMs ? `${Math.max(1, Math.round(asset.durationMs / 1000))} s` : "—"}</small></div><button className="delete-link" onClick={() => deleteRecording(asset.id)}>{language === "fr" ? "Supprimer" : "Delete"}</button></div>) : <EmptyState text={language === "fr" ? "Aucun enregistrement sauvegardé." : "No saved recordings."} />}</div>
    </div>
    <div className="privacy-note"><span>i</span><p>{language === "fr" ? "Pour obtenir une copie complète de vos données ou retirer votre consentement général au programme, contactez votre clinique. Les actions liées aux données sont consignées pour protéger votre dossier." : "To request a complete copy of your data or withdraw general program consent, contact your clinic. Data actions are logged to protect your record."}</p></div>
  </section>;
}

function Progress({ language }: { language: Language }) {
  return <section className="content-view"><p className="eyebrow">{language === "fr" ? "Votre chemin" : "Your journey"}</p><h2>{language === "fr" ? "Ce qui devient plus facile" : "What is becoming easier"}</h2><p className="view-intro">{language === "fr" ? "Vos progrès sont comparés à vos propres expériences, jamais à celles des autres." : "Your progress is compared with your own experience, never with anyone else’s."}</p><div className="progress-grid"><div className="progress-feature"><span className="progress-number">5</span><h3>{language === "fr" ? "mots personnels demandent moins d’aide" : "personal words need less help"}</h3><div className="support-track"><span style={{width:"74%"}} /></div><small>{language === "fr" ? "Depuis quatre semaines" : "Over four weeks"}</small></div><div className="progress-list"><ProgressItem letter="T" title={language === "fr" ? "Script du téléphone" : "Telephone script"} detail={language === "fr" ? "Utilisé avec un seul indice" : "Used with one cue"} /><ProgressItem letter="C" title={language === "fr" ? "Mission dans la cuisine" : "Kitchen mission"} detail={language === "fr" ? "Réussie 3 fois cette semaine" : "Completed 3 times this week"} /><ProgressItem letter="M" title={language === "fr" ? "Se lever d’une chaise" : "Stand up from a chair"} detail={language === "fr" ? "Pratiqué avec supervision" : "Practised with supervision"} /></div></div></section>;
}

function ProgressItem({ letter, title, detail }: { letter: string; title: string; detail: string }) { return <div className="progress-item"><span>{letter}</span><div><b>{title}</b><small>{detail}</small></div><strong>✓</strong></div>; }

function SimpleView({ language, onBoard, onPlan }: { language: Language; view: View; onBoard: () => void; onPlan: () => void }) {
  return <section className="content-view"><p className="eyebrow">Élan</p><h2>{language === "fr" ? "Communiquez à votre façon." : "Communicate your way."}</h2><p className="view-intro">{language === "fr" ? "Parler n’est qu’une façon de se faire comprendre." : "Speaking is only one way to be understood."}</p><div className="support-cards"><button onClick={onBoard}><span>•••</span><b>{language === "fr" ? "Tableau de communication" : "Communication board"}</b><small>{language === "fr" ? "60 messages organisés par thème" : "60 messages organized by theme"}</small></button><button onClick={onPlan}><span>i</span><b>{language === "fr" ? "Planifier une conversation" : "Plan a conversation"}</b><small>{language === "fr" ? "Choisir une séance à faire avec Sylvie" : "Choose a session to complete with Sylvie"}</small></button></div></section>;
}
