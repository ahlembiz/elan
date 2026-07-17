"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import GuidedSession from "./GuidedSession";
import type { GuidedSessionData, GuidedSessionEntry } from "./GuidedSession";
import MyPlan from "./MyPlan";
import { exerciseCatalog } from "./api/plan/exerciseCatalog";

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
  dailySession?: GuidedSessionData;
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
    communicate: "Parler",
    practice: "Ma séance",
    plan: "Mon plan",
    session: "Votre séance",
    start: "Commencer ma séance",
    shorter: "Choisir une autre séance",
    words: "Mes mots importants",
    wordsSub: "3 mots · avec indices",
    movement: "Se lever d’une chaise",
    movementSub: "5 répétitions · accompagné",
    mission: "Mission dans la cuisine",
    missionSub: "Demander un verre d’eau",
    rhythm: "Votre rythme cette semaine",
    rhythmSub: "Votre première séance vous attend",
    noStreak: "Chaque effort compte. Une journée de repos ne change pas vos progrès.",
    next: "Prochain rendez-vous",
    clinician: "Marie-Claude · Orthophoniste",
    board: "Tableau de communication",
    needToTalk: "J’ai besoin de communiquer",
  },
  en: {
    today: "Home",
    communicate: "Talk",
    practice: "My session",
    plan: "My plan",
    session: "Your session",
    start: "Start my session",
    shorter: "Choose another session",
    words: "My important words",
    wordsSub: "3 words · cues available",
    movement: "Stand up from a chair",
    movementSub: "5 repetitions · with a helper",
    mission: "Kitchen mission",
    missionSub: "Ask for a glass of water",
    rhythm: "Your rhythm this week",
    rhythmSub: "Your first session awaits",
    noStreak: "Every effort counts. A rest day does not change your progress.",
    next: "Next appointment",
    clinician: "Marie-Claude · Speech therapist",
    board: "Communication board",
    needToTalk: "I need to communicate",
  },
};

const boardThemes: readonly BoardTheme[] = [
  { id: "essential", icon: "⭐", fr: "Essentiel", en: "Essentials", messages: [
    ["Oui", "Yes", "✅"], ["Non", "No", "❌"], ["Je ne sais pas", "I don’t know", "🤷"], ["Attendez, s’il vous plaît", "Please wait", "✋"], ["Répétez, s’il vous plaît", "Please repeat", "🔁"],
    ["Je comprends", "I understand", "👍"], ["Je ne comprends pas", "I don’t understand", "😕"], ["Montrez-moi", "Show me", "👉"], ["Écrivez-le", "Write it down", "✏️"], ["Merci", "Thank you", "💛"],
  ] },
  { id: "health", icon: "🩺", fr: "Santé", en: "Health", messages: [
    ["J’ai besoin d’aide", "I need help", "🆘"], ["J’ai mal", "I am in pain", "😣"], ["Je suis étourdi", "I feel dizzy", "💫"], ["Je suis essoufflé", "I am short of breath", "😮‍💨"], ["Je suis fatigué", "I am tired", "😴"],
    ["J’ai chaud", "I am hot", "🥵"], ["J’ai froid", "I am cold", "🥶"], ["J’ai besoin de mes médicaments", "I need my medication", "💊"], ["Appelez l’infirmière", "Call the nurse", "👩‍⚕️"], ["Arrêtons maintenant", "Let’s stop now", "🛑"],
  ] },
  { id: "feelings", icon: "❤️", fr: "Émotions", en: "Feelings", messages: [
    ["Je vais bien", "I feel well", "😊"], ["Je suis calme", "I feel calm", "😌"], ["Je suis inquiet", "I am worried", "😟"], ["Je suis frustré", "I am frustrated", "😤"], ["Je suis triste", "I am sad", "😢"],
    ["Je suis content", "I am happy", "😄"], ["J’ai peur", "I am afraid", "😨"], ["J’ai besoin d’une pause", "I need a break", "⏸️"], ["Restez avec moi", "Stay with me", "🤝"], ["J’aimerais être seul", "I would like privacy", "🚪"],
  ] },
  { id: "food", icon: "🍽️", fr: "Repas", en: "Food & drink", messages: [
    ["J’ai faim", "I am hungry", "🍽️"], ["J’ai soif", "I am thirsty", "🥤"], ["Je voudrais de l’eau", "I would like water", "💧"], ["Je voudrais du café", "I would like coffee", "☕"], ["Encore, s’il vous plaît", "More, please", "➕"],
    ["C’est assez", "That is enough", "🙅"], ["J’aime ça", "I like this", "😋"], ["Je n’aime pas ça", "I don’t like this", "👎"], ["Quelle est la texture prescrite?", "What texture is prescribed?", "❓"], ["J’ai besoin de temps pour avaler", "I need time to swallow", "⏳"],
  ] },
  { id: "people", icon: "👥", fr: "Personnes et lieux", en: "People & places", messages: [
    ["Je veux voir ma famille", "I want to see my family", "👨‍👩‍👧"], ["Appelez Djimmy", "Call Djimmy", "📞"], ["Où est Salah?", "Where is Salah?", "🔎"], ["Je veux rentrer à la maison", "I want to go home", "🏠"], ["Je veux aller dehors", "I want to go outside", "🌳"],
    ["Je veux aller aux toilettes", "I need the washroom", "🚻"], ["Où sommes-nous?", "Where are we?", "📍"], ["Qui est cette personne?", "Who is this person?", "🤔"], ["Je veux parler au médecin", "I want to speak with the doctor", "🩺"], ["Je veux parler en privé", "I want to talk privately", "🤫"],
  ] },
  { id: "plans", icon: "📅", fr: "Temps et projets", en: "Time & plans", messages: [
    ["Quelle heure est-il?", "What time is it?", "🕐"], ["Quel jour sommes-nous?", "What day is it?", "📅"], ["Qu’est-ce qui est prévu?", "What is planned?", "🗓️"], ["J’ai un rendez-vous", "I have an appointment", "📌"], ["Je veux changer le plan", "I want to change the plan", "🔄"],
    ["Maintenant", "Now", "▶️"], ["Plus tard", "Later", "⏰"], ["Demain", "Tomorrow", "🌅"], ["Je suis prêt", "I am ready", "✅"], ["Je ne suis pas prêt", "I am not ready", "⛔"],
  ] },
];

const allMessages = boardThemes.flatMap((theme) => theme.messages);
const yesMessage = boardThemes[0].messages[0];
const noMessage = boardThemes[0].messages[1];

function readUsage(): Record<string, number> {
  try { return JSON.parse(window.localStorage.getItem("elan-board-usage") || "{}") as Record<string, number>; }
  catch { return {}; }
}

function topicOf(title: string) {
  return title.split("\u00b7")[1]?.trim() ?? title;
}

function composeLocalSession(variant: number): GuidedSessionData {
  const communication = exerciseCatalog.filter((item) => item.domain === "communication" && !item.requiresPartner && item.durationMinutes <= 10);
  const mobility = exerciseCatalog.filter((item) => item.domain === "mobility" && !item.requiresPartner && item.durationMinutes <= 10);
  const first = communication[(variant * 7) % communication.length];
  const movement = mobility[(variant * 5 + 2) % mobility.length];
  let second = communication[(variant * 7 + 9) % communication.length];
  for (let bump = 1; bump <= communication.length && (second.id === first.id || topicOf(second.titleFr) === topicOf(first.titleFr)); bump += 1) {
    second = communication[(variant * 7 + 9 + bump) % communication.length];
  }
  const picks = [first, movement, second];
  const entries: GuidedSessionEntry[] = picks.map((item, index) => ({
    id: `local-entry-${variant}-${index}`,
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
  }));
  return {
    id: `local-session-${variant}`,
    kind: "daily",
    titleFr: "Ma séance du jour",
    titleEn: "Today’s session",
    targetDuration: entries.reduce((sum, entry) => sum + (entry.durationMinutes ?? 5), 0),
    effortLevel: Math.max(1, Math.round(picks.reduce((sum, item) => sum + item.effortLevel, 0) / picks.length)),
    status: "active",
    entries,
  };
}

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [planFocus, setPlanFocus] = useState(false);
  const [guidedSession, setGuidedSession] = useState<GuidedSessionData | null>(null);
  const [sessionStep, setSessionStep] = useState<SessionStep>("checkin");
  const [energy, setEnergy] = useState<number | null>(null);
  const [cue, setCue] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [consentOpen, setConsentOpen] = useState(false);
  const [helper, setHelper] = useState(false);
  const [spoken, setSpoken] = useState<string | null>(null);
  const [showBig, setShowBig] = useState<BoardMessage | null>(null);
  const [boardTheme, setBoardTheme] = useState<BoardThemeId>("essential");
  const [boardSearch, setBoardSearch] = useState("");
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [daypart, setDaypart] = useState<"morning" | "afternoon" | "evening" | null>(null);
  const [dateLine, setDateLine] = useState("");
  const [todayIndex, setTodayIndex] = useState<number | null>(null);
  const [localVariant, setLocalVariant] = useState(0);
  const variantRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boardSearchRef = useRef<HTMLInputElement | null>(null);
  const t = copy[language];

  const notify = (text: string, tone: "success" | "error" = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ text, tone });
    toastTimerRef.current = setTimeout(() => setToast(null), 3600);
  };

  useEffect(() => {
    fetch("/api/product")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: ProductData) => { setProductData(data); setDataStatus("saved"); })
      .catch(() => setDataStatus("offline"));
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem("elan-language");
    const preferred: Language | null = stored === "fr" || stored === "en" ? stored : null;
    const hour = new Date().getHours();
    const storedVariant = Math.max(0, Number(window.localStorage.getItem("elan-session-variant")) || 0);
    variantRef.current = storedVariant;
    const frame = window.requestAnimationFrame(() => {
      if (preferred) setLanguage(preferred);
      setDaypart(hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening");
      setUsage(readUsage());
      setLocalVariant(storedVariant);
      setTodayIndex((new Date().getDay() + 6) % 7);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const advanceVariant = () => {
    variantRef.current += 1;
    window.localStorage.setItem("elan-session-variant", String(variantRef.current));
    setLocalVariant(variantRef.current);
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDateLine(new Date().toLocaleDateString(language === "fr" ? "fr-CA" : "en-CA", { weekday: "long", day: "numeric", month: "long" }));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [language]);

  useEffect(() => {
    if (!boardOpen && !consentOpen && !settingsOpen && !showBig) return;
    const frame = boardOpen && !showBig ? window.requestAnimationFrame(() => boardSearchRef.current?.focus({ preventScroll: true })) : 0;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (showBig) { setShowBig(null); return; }
      setBoardOpen(false); setConsentOpen(false); setSettingsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); if (frame) window.cancelAnimationFrame(frame); };
  }, [boardOpen, consentOpen, settingsOpen, showBig]);

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

  const chooseLanguage = (next: Language) => {
    setLanguage(next);
    window.localStorage.setItem("elan-language", next);
  };

  const nav = useMemo(() => {
    if (role === "family") return [
      { id: "overview", label: language === "fr" ? "Accueil" : "Home", mark: "🏠" },
      { id: "plan", label: language === "fr" ? "Séances" : "Sessions", mark: "🎯" },
      { id: "conversations", label: language === "fr" ? "Communiquer" : "Communicate", mark: "💬" },
      { id: "observations", label: language === "fr" ? "Notes" : "Notes", mark: "✏️" },
      { id: "guidance", label: language === "fr" ? "Conseils" : "Guidance", mark: "💡" },
    ];
    if (role === "admin") return [
      { id: "overview", label: language === "fr" ? "Vue d’ensemble" : "Overview", mark: "🏠" },
      { id: "appointments", label: language === "fr" ? "Rendez-vous" : "Appointments", mark: "📅" },
      { id: "todos", label: language === "fr" ? "Tâches" : "To-dos", mark: "✅" },
      { id: "diet", label: language === "fr" ? "Alimentation" : "Diet", mark: "🍽️" },
      { id: "exercises", label: language === "fr" ? "Bibliothèque" : "Library", mark: "📚" },
    ];
    return [
      { id: "today", label: t.today, mark: "🏠" },
      { id: "practice", label: t.practice, mark: "🎯" },
      { id: "communicate", label: t.communicate, mark: "💬" },
      { id: "plan", label: t.plan, mark: "📋" },
    ];
  }, [t, role, language]);

  const roleIdentity = role === "patient"
    ? { initials: "SL", name: currentName, detail: language === "fr" ? "Mon espace" : "My space" }
    : role === "family"
      ? { initials: "DJ", name: currentName, detail: language === "fr" ? "Partenaire" : "Partner" }
      : { initials: "ÉA", name: currentName, detail: language === "fr" ? "Administration" : "Administration" };

  const signOut = async () => {
    await fetch("/api/session", { method: "DELETE" });
    window.location.assign("/login");
  };

  const localSession = useMemo(() => composeLocalSession(localVariant), [localVariant]);
  const upcomingSession = productData.dailySession ?? localSession;

  const beginSession = () => {
    setGuidedSession(upcomingSession);
    setSessionStep("checkin");
    setSessionOpen(true);
    if (!productData.dailySession) advanceVariant();
  };

  const completeGuidedEntry = async (entry: GuidedSessionEntry) => {
    if (entry.id.startsWith("local-")) return;
    const response = await fetch("/api/plan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: entry.id, status: "completed" }),
    });
    if (!response.ok) throw new Error("Unable to save exercise");
    setProductData((current) => current.dailySession ? {
      ...current,
      dailySession: {
        ...current.dailySession,
        entries: current.dailySession.entries.map((item) => item.id === entry.id ? { ...item, status: "completed" } : item),
      },
    } : current);
    setDataStatus("saved");
  };

  const completeDailySession = async (session: GuidedSessionData) => {
    if (session.id.startsWith("local-session")) {
      const replacement = composeLocalSession(variantRef.current);
      advanceVariant();
      notify(language === "fr" ? "Bravo — votre séance est terminée. Une nouvelle est prête." : "Well done — session complete. A new one is ready.");
      return replacement;
    }
    const response = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "complete_session", sessionId: session.id, replaceDaily: true }),
    });
    if (!response.ok) throw new Error("Unable to complete session");
    const result = await response.json() as { replacement: GuidedSessionData | null };
    setProductData((current) => ({ ...current, dailySession: result.replacement ?? undefined }));
    setDataStatus("saved");
    notify(language === "fr" ? "Bravo — votre séance du jour est terminée." : "Well done — today’s session is complete.");
    return result.replacement;
  };

  const saveSession = async () => {
    try {
      const response = await fetch("/api/product", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "session_complete", supportLevel: cue > 0 ? 3 : 4, effort: energy ?? 3, confidence: 4 }) });
      if (!response.ok) throw new Error();
      const { attempt } = await response.json();
      setProductData((current) => ({ ...current, attempts: [attempt, ...current.attempts] }));
      setDataStatus("saved");
      notify(language === "fr" ? "Votre séance est enregistrée." : "Your session has been saved.");
    } catch {
      setDataStatus("offline");
      notify(language === "fr" ? "Impossible d’enregistrer. Vérifiez la connexion." : "Could not save. Check your connection.", "error");
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
      notify(language === "fr" ? "Votre choix a été enregistré." : "Your choice has been saved.");
    } catch {
      setDataStatus("offline");
      notify(language === "fr" ? "Impossible d’enregistrer votre choix. Réessayez." : "Could not save your choice. Please try again.", "error");
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

  const speakText = (message: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = language === "fr" ? "fr-CA" : "en-CA";
      utterance.rate = 0.92;
      window.speechSynthesis.speak(utterance);
    }
  };

  const speakMessage = (message: BoardMessage) => {
    const text = language === "fr" ? message[0] : message[1];
    setSpoken(text);
    speakText(text);
    setUsage((current) => {
      const next = { ...current, [message[0]]: (current[message[0]] ?? 0) + 1 };
      try { window.localStorage.setItem("elan-board-usage", JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  };

  const spokenMessage = spoken ? allMessages.find((message) => message[0] === spoken || message[1] === spoken) ?? null : null;

  const frequents = useMemo(() => {
    return Object.entries(usage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([fr]) => allMessages.find((message) => message[0] === fr))
      .filter((message): message is BoardMessage => Boolean(message));
  }, [usage]);

  const activeBoardTheme = boardThemes.find((themeItem) => themeItem.id === boardTheme) ?? boardThemes[0];
  const boardQuery = boardSearch.trim().toLocaleLowerCase(language === "fr" ? "fr-CA" : "en-CA");
  const boardResults = (boardQuery ? allMessages : activeBoardTheme.messages)
    .filter((message) => !(boardTheme === "essential" && !boardQuery && (message === yesMessage || message === noMessage)))
    .filter((message) => !boardQuery || `${message[0]} ${message[1]}`.toLocaleLowerCase(language === "fr" ? "fr-CA" : "en-CA").includes(boardQuery));

  const greeting = role !== "patient"
    ? (language === "fr" ? `Bonjour, ${currentName}` : `Hello, ${currentName}`)
    : `${daypart === "afternoon" ? (language === "fr" ? "Bon après-midi" : "Good afternoon") : daypart === "evening" ? (language === "fr" ? "Bonsoir" : "Good evening") : (language === "fr" ? "Bonjour" : "Good morning")}, ${currentName}`;

  const patientPageTitle = view === "today" ? greeting : view === "practice" ? t.practice : view === "communicate" ? (language === "fr" ? "Communiquer" : "Communicate") : view === "plan" ? t.plan : view === "progress" ? (language === "fr" ? "Mon chemin" : "My path") : (language === "fr" ? "Aide et confidentialité" : "Help and privacy");
  const focusMode = sessionOpen || planFocus;

  return (
    <div className={focusMode ? "app-shell focus-mode" : "app-shell"}>
      <a className="skip-link" href="#main-content">{language === "fr" ? "Aller au contenu principal" : "Skip to main content"}</a>
      <aside className="side-nav" aria-label={language === "fr" ? "Navigation principale" : "Main navigation"}>
        <button className="brand" onClick={() => { if (role === "patient") setView("today"); else setPortalTab("overview"); setSessionOpen(false); }} aria-label="Élan, accueil">
          <span className="brand-mark">é</span>
          <span>Élan</span>
        </button>
        <nav>
          {nav.map((item) => (
            <button key={item.id} aria-current={(role === "patient" ? view === item.id : portalTab === item.id) ? "page" : undefined} className={(role === "patient" ? view === item.id : portalTab === item.id) ? "nav-item active" : "nav-item"} onClick={() => { setSessionOpen(false); if (role === "patient") { if (item.id === "communicate") { setBoardOpen(true); return; } setView(item.id as View); } else setPortalTab(item.id); }}>
              <span className="nav-mark" aria-hidden="true">{item.mark}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button className="profile-pill" onClick={() => setSettingsOpen(true)} aria-label={`${roleIdentity.name} — ${language === "fr" ? "Ouvrir les réglages" : "Open settings"}`}>
          <span>{roleIdentity.initials}</span>
          <span className="profile-copy">{roleIdentity.name}<br /><small>{roleIdentity.detail}</small></span>
        </button>
      </aside>

      <main className="main-content" id="main-content" tabIndex={-1}>
        <header className="topbar">
          <div>
            <p className="eyebrow">{role === "patient" ? (dateLine || "Élan") : role === "family" ? (language === "fr" ? "Mode partenaire" : "Partner mode") : (language === "fr" ? "Administration du plan" : "Plan administration")}</p>
            <h1>{sessionOpen ? (language === "fr" ? "Ma séance" : "My session") : role === "patient" ? patientPageTitle : role === "family" ? (language === "fr" ? "Bonjour, Djimmy" : "Hello, Djimmy") : (language === "fr" ? "Plan de Salah" : "Salah’s plan")}</h1>
          </div>
          <div className="top-actions">
            <button className="audio-button" onClick={() => speakText(sessionOpen ? (language === "fr" ? "Ma séance" : "My session") : `${patientPageTitle}.`)} aria-label={language === "fr" ? "Écouter cette page" : "Listen to this page"}>
              <span aria-hidden="true">🔊</span>
              {language === "fr" ? "Écouter" : "Listen"}
            </button>
            <button className="settings-button" onClick={() => setSettingsOpen(true)} aria-haspopup="dialog">
              <span aria-hidden="true">⚙</span>
              {language === "fr" ? "Réglages" : "Settings"}
            </button>
          </div>
        </header>

        <div className="view-enter" key={sessionOpen ? "session" : role === "patient" ? view : portalTab}>
        {sessionOpen && guidedSession ? (
          <GuidedSession
            key={guidedSession.id}
            language={language}
            session={guidedSession}
            onEntryComplete={completeGuidedEntry}
            onSessionComplete={completeDailySession}
            onExit={() => { setSessionOpen(false); setGuidedSession(null); }}
            onOpenReplacement={(replacement) => setGuidedSession(replacement)}
          />
        ) : sessionOpen ? (
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
          <MyPlan language={language} initialTab="exercises" actorRole="family" attemptCount={productData.attempts.length} onFocusChange={setPlanFocus} />
        ) : role === "family" ? (
          <FamilyPortal language={language} tab={portalTab} data={productData} dataStatus={dataStatus} setData={setProductData} setDataStatus={setDataStatus} onBoard={() => setBoardOpen(true)} onPlan={() => setPortalTab("plan")} />
        ) : role === "admin" ? (
          <MyPlan key={portalTab} language={language} initialTab={portalTab} actorRole="admin" attemptCount={productData.attempts.length} />
        ) : view === "today" ? (
          <Home language={language} onStart={beginSession} onShuffle={advanceVariant} onLibrary={() => setView("practice")} onPlan={() => setView("plan")} onBoard={() => setBoardOpen(true)} onProgress={() => setView("progress")} attemptCount={productData.attempts.length} dailySession={upcomingSession} isPlanned={Boolean(productData.dailySession)} todayIndex={todayIndex} />
        ) : view === "progress" ? (
          <Progress language={language} onHome={() => setView("today")} />
        ) : view === "practice" ? (
          <MyPlan language={language} initialTab="exercises" actorRole="patient" attemptCount={productData.attempts.length} onFocusChange={setPlanFocus} />
        ) : view === "plan" ? (
          <MyPlan language={language} actorRole="patient" attemptCount={productData.attempts.length} onFocusChange={setPlanFocus} />
        ) : (
          <PrivacyCenter language={language} data={productData} setData={setProductData} onConsent={updateConsent} dataStatus={dataStatus} />
        )}
        </div>
      </main>

      {role === "patient" && !sessionOpen && !boardOpen && <button className="quick-board" onClick={() => setBoardOpen(true)}>
        <span aria-hidden="true">💬</span>
        {t.communicate}
      </button>}

      {boardOpen && (
        <div className="board-screen" role="dialog" aria-modal="true" aria-labelledby="board-title">
          <div className="board-inner">
            <div className="board-top">
              <div>
                <p className="eyebrow">{language === "fr" ? "Toujours disponible" : "Always available"}</p>
                <h2 id="board-title">{t.board}</h2>
              </div>
              <button className="close-button" onClick={() => setBoardOpen(false)} aria-label={language === "fr" ? "Fermer le tableau" : "Close the board"}>×</button>
            </div>

            <div className="board-yesno" role="group" aria-label={language === "fr" ? "Réponses rapides" : "Quick answers"}>
              <button className="yes" onClick={() => speakMessage(yesMessage)}><span aria-hidden="true">✅</span>{language === "fr" ? "Oui" : "Yes"}</button>
              <button className="no" onClick={() => speakMessage(noMessage)}><span aria-hidden="true">❌</span>{language === "fr" ? "Non" : "No"}</button>
            </div>

            <label className="board-search"><span aria-hidden="true">⌕</span><input ref={boardSearchRef} value={boardSearch} onChange={(event) => setBoardSearch(event.target.value)} aria-label={language === "fr" ? "Rechercher dans les messages" : "Search messages"} placeholder={language === "fr" ? "Rechercher parmi 60 messages" : "Search 60 messages"} />{boardSearch && <button type="button" className="board-clear" onClick={() => { setBoardSearch(""); boardSearchRef.current?.focus(); }} aria-label={language === "fr" ? "Effacer la recherche" : "Clear search"}>×</button>}</label>

            {!boardQuery && frequents.length > 0 && (
              <div className="board-frequents" aria-label={language === "fr" ? "Messages fréquents" : "Frequent messages"}>
                <span className="board-frequents-label">{language === "fr" ? "Fréquents" : "Frequent"}</span>
                {frequents.map((message) => <button key={`frequent-${message[0]}`} onClick={() => speakMessage(message)}><span aria-hidden="true">{message[2]}</span>{language === "fr" ? message[0] : message[1]}</button>)}
              </div>
            )}

            <div className="board-theme-tabs" role="tablist" aria-label={language === "fr" ? "Thèmes du tableau" : "Board themes"}>
              {boardThemes.map((themeItem) => <button key={themeItem.id} role="tab" aria-selected={boardTheme === themeItem.id} className={boardTheme === themeItem.id && !boardQuery ? "selected" : ""} onClick={() => { setBoardTheme(themeItem.id); setBoardSearch(""); }}><span aria-hidden="true">{themeItem.icon}</span>{language === "fr" ? themeItem.fr : themeItem.en}</button>)}
            </div>

            <div className="message-grid">
              {boardResults.map((message) => {
                const messageText = language === "fr" ? message[0] : message[1];
                return <button key={`${message[0]}-${message[1]}`} className={spoken === messageText ? "message-button spoken" : "message-button"} onClick={() => speakMessage(message)}>
                  <span className="message-symbol" aria-hidden="true">{message[2]}</span>
                  {messageText}
                </button>
              })}
            </div>
            {!boardResults.length && <p className="board-no-results">{language === "fr" ? "Aucun message trouvé. Essayez un autre mot." : "No messages found. Try another word."}</p>}

            {spoken && <div className="spoken-bar" aria-live="polite">
              <span className="equalizer" aria-hidden="true"><i /><i /><i /><i /></span>
              <span className="spoken-text">{spoken}</span>
              <span className="spoken-actions">
                <button onClick={() => speakText(spoken)}>{language === "fr" ? "Réécouter" : "Play again"}</button>
                {spokenMessage && <button onClick={() => setShowBig(spokenMessage)}>{language === "fr" ? "Montrer en grand" : "Show it big"}</button>}
              </span>
            </div>}
          </div>
        </div>
      )}

      {showBig && (
        <div className="show-screen" role="dialog" aria-modal="true" aria-label={language === "fr" ? "Message en grand" : "Message shown large"} onMouseDown={(event) => { if (event.target === event.currentTarget) setShowBig(null); }}>
          <div className="show-card">
            <span className="show-symbol" aria-hidden="true">{showBig[2]}</span>
            <strong>{language === "fr" ? showBig[0] : showBig[1]}</strong>
            <div className="show-actions">
              <button onClick={() => speakText(language === "fr" ? showBig[0] : showBig[1])}>🔊 {language === "fr" ? "Réécouter" : "Play again"}</button>
              <button onClick={() => setShowBig(null)}>{language === "fr" ? "Fermer" : "Close"}</button>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
          <section className="settings-sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">{roleIdentity.name} · {roleIdentity.detail}</p>
                <h2 id="settings-title">{language === "fr" ? "Réglages" : "Settings"}</h2>
              </div>
              <button className="close-button" onClick={() => setSettingsOpen(false)} aria-label={language === "fr" ? "Fermer" : "Close"}>×</button>
            </div>
            <div className="settings-group">
              <span className="settings-label">{language === "fr" ? "Langue" : "Language"}</span>
              <div className="language-switch" role="group" aria-label={language === "fr" ? "Choisir la langue" : "Choose language"}>
                <button className={language === "fr" ? "selected" : ""} onClick={() => chooseLanguage("fr")} aria-pressed={language === "fr"}>Français</button>
                <button className={language === "en" ? "selected" : ""} onClick={() => chooseLanguage("en")} aria-pressed={language === "en"}>English</button>
              </div>
            </div>
            <div className="settings-group">
              <span className="settings-label">{language === "fr" ? "Confort de lecture" : "Reading comfort"}</span>
              <div className="settings-row">
                <button className="text-size-button" onClick={toggleTextSize} aria-pressed={textSize === "large"}><span aria-hidden="true">A+</span>{textSize === "large" ? (language === "fr" ? "Texte agrandi" : "Large text") : (language === "fr" ? "Agrandir le texte" : "Make text larger")}</button>
                <button className="theme-button" onClick={toggleTheme} aria-pressed={theme === "night"}><span aria-hidden="true">{theme === "day" ? "☾" : "☀"}</span>{theme === "day" ? (language === "fr" ? "Thème de nuit" : "Night theme") : (language === "fr" ? "Thème de jour" : "Day theme")}</button>
              </div>
            </div>
            {role === "patient" && <div className="settings-group">
              <span className="settings-label">{language === "fr" ? "Aide" : "Help"}</span>
              <button className="settings-link" onClick={() => { setSettingsOpen(false); setSessionOpen(false); setView("privacy"); }}><span aria-hidden="true">🔒</span>{language === "fr" ? "Aide et confidentialité" : "Help and privacy"}<i aria-hidden="true">→</i></button>
            </div>}
            <button className="sign-out-button" onClick={signOut}>{language === "fr" ? "Quitter Élan" : "Sign out"}</button>
          </section>
        </div>
      )}

      {consentOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="consent-modal" role="dialog" aria-modal="true" aria-labelledby="consent-title">
            <div className="consent-symbol" aria-hidden="true">🎙️</div>
            <p className="eyebrow">{language === "fr" ? "Votre choix" : "Your choice"}</p>
            <h2 id="consent-title">{language === "fr" ? "Autoriser les enregistrements vocaux?" : "Allow voice recordings?"}</h2>
            <p>{language === "fr" ? "Élan enregistrera votre voix seulement lorsque vous appuyez sur Enregistrer. Les enregistrements servent à vous réécouter et peuvent être révisés par votre orthophoniste autorisée." : "Élan records your voice only when you press Record. Recordings are for playback and may be reviewed by your authorized speech therapist."}</p>
            <div className="consent-facts"><span><b>{language === "fr" ? "Facultatif" : "Optional"}</b><small>{language === "fr" ? "Vous pouvez pratiquer sans enregistrer." : "You can practise without recording."}</small></span><span><b>{language === "fr" ? "Révocable" : "Reversible"}</b><small>{language === "fr" ? "Changez ce choix dans Aide et confidentialité." : "Change this choice in Help and privacy."}</small></span><span><b>{language === "fr" ? "Privé" : "Private"}</b><small>{language === "fr" ? "Aucun usage pour améliorer un modèle." : "Not used for model improvement."}</small></span></div>
            <div className="consent-actions"><button className="secondary-button" onClick={() => { setConsentOpen(false); updateConsent(false); }}>{language === "fr" ? "Non, continuer sans" : "No, continue without"}</button><button className="portal-primary" onClick={() => updateConsent(true)}>{language === "fr" ? "Oui, j’autorise" : "Yes, I consent"}</button></div>
          </section>
        </div>
      )}

      {toast && <div className={toast.tone === "error" ? "toast error" : "toast"} role="status"><span aria-hidden="true">{toast.tone === "error" ? "!" : "✓"}</span>{toast.text}</div>}
    </div>
  );
}

function Home({ language, onStart, onShuffle, onLibrary, onPlan, onBoard, onProgress, attemptCount, dailySession, isPlanned, todayIndex }: { language: Language; onStart: () => void; onShuffle: () => void; onLibrary: () => void; onPlan: () => void; onBoard: () => void; onProgress: () => void; attemptCount: number; dailySession?: ProductData["dailySession"]; isPlanned: boolean; todayIndex: number | null }) {
  const t = copy[language];
  const dailyEntries = dailySession?.entries.slice(0, 3) ?? [];
  const dailyDone = dailySession?.entries.filter((entry) => entry.status === "completed").length ?? 0;
  const dailyTotal = dailySession?.entries.length ?? 3;
  const dailyDuration = dailySession?.targetDuration ?? 18;
  const started = dailyDone > 0 && dailyDone < dailyTotal;
  return <div className="dashboard accessible-home">
    <section className="home-hero" aria-labelledby="home-hero-title">
      <div className="home-hero-copy">
        <span className="status-chip"><span className="status-dot" /> {isPlanned ? (language === "fr" ? "Votre séance est prête" : "Your session is ready") : (language === "fr" ? "Une nouvelle séance à chaque fois" : "A fresh session every time")}</span>
        <h2 id="home-hero-title">{started ? (language === "fr" ? "Continuez à votre rythme." : "Continue at your own pace.") : (language === "fr" ? "Une activité à la fois, à votre rythme." : "One activity at a time, at your pace.")}</h2>
        <ol className="home-step-list">
          {dailyEntries.length ? dailyEntries.map((entry, index) => <li key={entry.id} className={entry.status === "completed" ? "done" : ""}><span aria-hidden="true">{entry.status === "completed" ? "✓" : index + 1}</span><div><b>{language === "fr" ? entry.titleFr : entry.titleEn}</b><small>{language === "fr" ? entry.descriptionFr : entry.descriptionEn}</small></div></li>) : <>
            <li><span aria-hidden="true">1</span><div><b>{t.words}</b><small>{t.wordsSub}</small></div></li>
            <li><span aria-hidden="true">2</span><div><b>{t.movement}</b><small>{t.movementSub}</small></div></li>
            <li><span aria-hidden="true">3</span><div><b>{t.mission}</b><small>{t.missionSub}</small></div></li>
          </>}
        </ol>
        <button className="home-primary-action" onClick={onStart}>
          <span className="home-action-icon" aria-hidden="true">▶</span>
          <span><b>{started ? (language === "fr" ? "Continuer ma séance" : "Continue my session") : dailySession ? (language === "fr" ? "Commencer ma séance du jour" : "Start today’s session") : t.start}</b><small>{started ? `${dailyDone} ${language === "fr" ? "sur" : "of"} ${dailyTotal} ${language === "fr" ? "activités faites" : "activities done"}` : `${dailyDuration} ${language === "fr" ? "minutes · guidée étape par étape" : "minutes · guided step by step"}`}</small></span>
          <span className="home-action-arrow" aria-hidden="true">→</span>
        </button>
        <div className="home-hero-links">
          {!isPlanned && <button className="home-secondary-action" onClick={onShuffle}>🔀 {language === "fr" ? "Une autre proposition" : "Another suggestion"}</button>}
          <button className="home-secondary-action" onClick={onLibrary}>{t.shorter}<span aria-hidden="true">→</span></button>
        </div>
      </div>
      <div className="home-hero-art" aria-hidden="true"><span>{dailyDuration}</span><small>min</small></div>
    </section>

    <section className="home-tiles" aria-label={language === "fr" ? "Accès rapide" : "Quick access"}>
      <button className="home-tile talk" onClick={onBoard}>
        <span className="home-tile-icon" aria-hidden="true">💬</span>
        <span><small>{language === "fr" ? "Toujours disponible" : "Always available"}</small><b>{t.needToTalk}</b><em>{language === "fr" ? "60 messages · lus à voix haute" : "60 messages · read aloud"}</em></span>
        <span aria-hidden="true">→</span>
      </button>
      <button className="home-tile plan" onClick={onPlan}>
        <span className="home-tile-icon" aria-hidden="true">📋</span>
        <span><small>{t.next}</small><b>16 {language === "fr" ? "juillet · 10:30" : "July · 10:30"}</b><em>{t.clinician}</em></span>
        <span aria-hidden="true">→</span>
      </button>
    </section>

    <section className="home-rhythm-strip card-surface" aria-labelledby="home-rhythm-title">
      <div>
        <p className="eyebrow">{t.rhythm}</p>
        <h3 id="home-rhythm-title">{attemptCount ? (language === "fr" ? `${attemptCount} séances enregistrées` : `${attemptCount} sessions recorded`) : t.rhythmSub}</h3>
        <p>{t.noStreak}</p>
      </div>
      <div className="home-week" aria-label={language === "fr" ? "Votre semaine" : "Your week"}>{(language === "fr" ? ["L", "M", "M", "J", "V", "S", "D"] : ["M", "T", "W", "T", "F", "S", "S"]).map((day, index) => <span key={index} className={index === todayIndex ? "today-dot" : ""}>{day}</span>)}</div>
      <button className="home-path-link" onClick={onProgress}>{language === "fr" ? "Voir mon chemin" : "See my path"}<span aria-hidden="true">→</span></button>
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
    <section className="session-card" key={step}>
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
      {step === "complete" && <div className="complete-state"><div className="complete-mark">✓</div><p className="eyebrow">{language === "fr" ? "Séance terminée" : "Session complete"}</p><h2>{language === "fr" ? "Vous avez fait quelque chose d’important aujourd’hui." : "You did something meaningful today."}</h2><p>{language === "fr" ? "Vous avez pratiqué une phrase utile avec moins d’aide. Votre effort est enregistré." : "You practised a useful phrase with less help. Your effort has been saved."}</p><div className="achievement"><span>+1</span><div><b>{language === "fr" ? "Repère ajouté à votre chemin" : "Marker added to your path"}</b><small>{language === "fr" ? "Vie quotidienne" : "Daily life"}</small></div></div><button className="primary-button" onClick={onClose}>{language === "fr" ? "Retour à l’accueil" : "Back to home"}</button></div>}
    </section>
  </div>;
}

function ResearchLink({ language, label, href }: { language: Language; label: string; href: string }) { return <details className="info-disclosure inline"><summary><span aria-hidden="true">i</span>{language === "fr" ? "Fondé sur la recherche" : "Research-backed"}</summary><div><a href={href} target="_blank" rel="noreferrer">{label} ↗</a></div></details>; }

function FamilyPortal({ language, tab, data, dataStatus, setData, setDataStatus, onBoard, onPlan }: { language: Language; tab: string; data: ProductData; dataStatus: "loading" | "saved" | "offline"; setData: Dispatch<SetStateAction<ProductData>>; setDataStatus: (status: "loading" | "saved" | "offline") => void; onBoard: () => void; onPlan: () => void }) {
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("communication");
  const [sent, setSent] = useState(false);
  const saveObservation = async () => {
    if (!note.trim()) return;
    setSent(false);
    try {
      const response = await fetch("/api/product", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "observation", authorName: "Djimmy", category, note }) });
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

function Progress({ language, onHome }: { language: Language; onHome: () => void }) {
  const milestones = language === "fr" ? [
    { icon: "☎️", title: "Script du téléphone", detail: "Utilisé avec un seul indice" },
    { icon: "💧", title: "Mission dans la cuisine", detail: "Réussie 3 fois cette semaine" },
    { icon: "🪑", title: "Se lever d’une chaise", detail: "Pratiqué avec supervision" },
  ] : [
    { icon: "☎️", title: "Telephone script", detail: "Used with one cue" },
    { icon: "💧", title: "Kitchen mission", detail: "Completed 3 times this week" },
    { icon: "🪑", title: "Stand up from a chair", detail: "Practised with supervision" },
  ];
  return <section className="content-view path-view">
    <p className="eyebrow">{language === "fr" ? "Votre chemin" : "Your path"}</p>
    <h2>{language === "fr" ? "Ce qui devient plus facile" : "What is becoming easier"}</h2>
    <p className="view-intro">{language === "fr" ? "Vos progrès sont comparés à vos propres expériences, jamais à celles des autres." : "Your progress is compared with your own experience, never with anyone else’s."}</p>
    <div className="path-feature card-surface">
      <span className="path-number">5</span>
      <div>
        <h3>{language === "fr" ? "mots personnels demandent moins d’aide" : "personal words need less help"}</h3>
        <div className="support-track"><span style={{width:"74%"}} /></div>
        <small>{language === "fr" ? "Depuis quatre semaines" : "Over four weeks"}</small>
      </div>
    </div>
    <ol className="path-milestones">
      {milestones.map((milestone) => <li key={milestone.title} className="card-surface"><span className="path-milestone-icon" aria-hidden="true">{milestone.icon}</span><div><b>{milestone.title}</b><small>{milestone.detail}</small></div><strong aria-hidden="true">✓</strong></li>)}
    </ol>
    <button className="home-path-link" onClick={onHome}>← {language === "fr" ? "Retour à l’accueil" : "Back to home"}</button>
  </section>;
}
