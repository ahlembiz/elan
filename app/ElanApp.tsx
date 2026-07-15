"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

type Language = "fr" | "en";
type View = "today" | "communicate" | "practice" | "progress" | "help";
type SessionStep = "checkin" | "words" | "movement" | "mission" | "complete";
type Role = "patient" | "family" | "clinician";

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
    today: "Aujourd’hui",
    communicate: "Communiquer",
    practice: "Pratiquer",
    progress: "Mes progrès",
    help: "Aide",
    greeting: "Bonjour, Salah",
    subtitle: "Voici votre programme pour aujourd’hui.",
    goodMorning: "Mardi 14 juillet",
    ready: "Prêt à commencer?",
    session: "Votre séance",
    minutes: "Environ 18 minutes",
    start: "Commencer la séance",
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
    today: "Today",
    communicate: "Communicate",
    practice: "Practice",
    progress: "My progress",
    help: "Help",
    greeting: "Hello, Salah",
    subtitle: "Here is your program for today.",
    goodMorning: "Tuesday, July 14",
    ready: "Ready to begin?",
    session: "Your session",
    minutes: "About 18 minutes",
    start: "Start session",
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

const boardMessages = {
  fr: ["Oui", "Non", "J’ai besoin d’aide", "Attendez, s’il vous plaît", "Je ne comprends pas", "J’ai mal", "Je suis fatigué", "Merci"],
  en: ["Yes", "No", "I need help", "Please wait", "I don’t understand", "I am in pain", "I am tired", "Thank you"],
};

export default function ÉlanApp() {
  const [language, setLanguage] = useState<Language>("fr");
  const [role, setRole] = useState<Role>("patient");
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

  const nav = useMemo(() => {
    if (role === "family") return [
      { id: "overview", label: language === "fr" ? "Soutien du jour" : "Today’s support", mark: "S" },
      { id: "conversations", label: language === "fr" ? "Conversations" : "Conversations", mark: "C" },
      { id: "observations", label: language === "fr" ? "Observations" : "Observations", mark: "O" },
      { id: "guidance", label: language === "fr" ? "Guidance" : "Guidance", mark: "?" },
    ];
    if (role === "clinician") return [
      { id: "overview", label: language === "fr" ? "Dossier patient" : "Patient record", mark: "D" },
      { id: "program", label: language === "fr" ? "Programme" : "Program", mark: "P" },
      { id: "results", label: language === "fr" ? "Résultats" : "Results", mark: "R" },
      { id: "recordings", label: language === "fr" ? "Enregistrements" : "Recordings", mark: "E" },
      { id: "observations", label: language === "fr" ? "Observations" : "Observations", mark: "O" },
    ];
    return [
      { id: "today", label: t.today, mark: "A" },
      { id: "communicate", label: t.communicate, mark: "C" },
      { id: "practice", label: t.practice, mark: "P" },
      { id: "progress", label: t.progress, mark: "M" },
      { id: "help", label: t.help, mark: "?" },
    ];
  }, [t, role, language]);

  const roleIdentity = role === "patient"
    ? { initials: "SL", name: "Salah", detail: language === "fr" ? "Mon profil" : "My profile" }
    : role === "family"
      ? { initials: "SY", name: "Sylvie", detail: language === "fr" ? "Partenaire" : "Partner" }
      : { initials: "MC", name: "Marie-Claude", detail: language === "fr" ? "Orthophoniste" : "Speech therapist" };

  const selectRole = (nextRole: Role) => {
    setRole(nextRole);
    setSessionOpen(false);
    setPortalTab("overview");
    if (nextRole === "patient") setView("today");
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

  return (
    <div className="app-shell">
      <aside className="side-nav" aria-label={language === "fr" ? "Navigation principale" : "Main navigation"}>
        <button className="brand" onClick={() => { setView("today"); setSessionOpen(false); }} aria-label="Élan, accueil">
          <span className="brand-mark">é</span>
          <span>Élan</span>
        </button>
        <nav>
          {nav.map((item) => (
            <button key={item.id} className={(role === "patient" ? view === item.id : portalTab === item.id) ? "nav-item active" : "nav-item"} onClick={() => { setSessionOpen(false); if (role === "patient") { setView(item.id as View); if (item.id === "communicate") setBoardOpen(true); } else setPortalTab(item.id); }}>
              <span className="nav-mark" aria-hidden="true">{item.mark}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button className="profile-pill" aria-label={`${roleIdentity.name} — ${roleIdentity.detail}`}>
          <span>{roleIdentity.initials}</span>
          <span className="profile-copy">{roleIdentity.name}<br /><small>{roleIdentity.detail}</small></span>
        </button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">{role === "patient" ? t.goodMorning : role === "family" ? (language === "fr" ? "Mode partenaire" : "Partner mode") : (language === "fr" ? "Portail clinique" : "Clinician portal")}</p>
            <h1>{sessionOpen ? (language === "fr" ? "Ma séance" : "My session") : role === "patient" ? t.greeting : role === "family" ? (language === "fr" ? "Bonjour, Sylvie" : "Hello, Sylvie") : (language === "fr" ? "Dossier de Salah" : "Salah’s record")}</h1>
          </div>
          <div className="top-actions">
            <div className="role-switch" role="group" aria-label={language === "fr" ? "Changer de rôle" : "Change role"}>
              <button className={role === "patient" ? "selected" : ""} onClick={() => selectRole("patient")}>{language === "fr" ? "Patient" : "Patient"}</button>
              <button className={role === "family" ? "selected" : ""} onClick={() => selectRole("family")}>{language === "fr" ? "Proche" : "Family"}</button>
              <button className={role === "clinician" ? "selected" : ""} onClick={() => selectRole("clinician")}>{language === "fr" ? "Clinique" : "Clinician"}</button>
            </div>
            <div className="language-switch" role="group" aria-label={language === "fr" ? "Choisir la langue" : "Choose language"}>
              <button className={language === "fr" ? "selected" : ""} onClick={() => setLanguage("fr")} aria-pressed={language === "fr"}>FR</button>
              <button className={language === "en" ? "selected" : ""} onClick={() => setLanguage("en")} aria-pressed={language === "en"}>EN</button>
            </div>
            <button className="audio-button" onClick={() => speakMessage(sessionOpen ? (language === "fr" ? "Ma séance" : "My session") : `${t.greeting}. ${t.subtitle}`)} aria-label={language === "fr" ? "Écouter cette page" : "Listen to this page"}>
              <span aria-hidden="true">)))</span>
              {language === "fr" ? "Écouter" : "Listen"}
            </button>
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
        ) : role === "family" ? (
          <FamilyPortal language={language} tab={portalTab} data={productData} dataStatus={dataStatus} setData={setProductData} setDataStatus={setDataStatus} />
        ) : role === "clinician" ? (
          <ClinicianPortal language={language} tab={portalTab} data={productData} dataStatus={dataStatus} />
        ) : view === "today" ? (
          <Today language={language} onStart={beginSession} />
        ) : view === "progress" ? (
          <Progress language={language} />
        ) : view === "practice" ? (
          <Practice language={language} onStart={beginSession} />
        ) : view === "help" ? (
          <PrivacyCenter language={language} data={productData} setData={setProductData} onConsent={updateConsent} dataStatus={dataStatus} />
        ) : (
          <SimpleView language={language} view={view} onBoard={() => setBoardOpen(true)} />
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
            <p className="board-instruction">{language === "fr" ? "Touchez un message pour le faire lire à voix haute." : "Tap a message to say it aloud."}</p>
            <div className="message-grid">
              {boardMessages[language].map((message, index) => (
                <button key={message} className={spoken === message ? "message-button spoken" : "message-button"} onClick={() => speakMessage(message)}>
                  <span className="message-symbol" aria-hidden="true">{["✓", "×", "+", "…", "?", "!", "z", "♥"][index]}</span>
                  {message}
                </button>
              ))}
            </div>
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

function Today({ language, onStart }: { language: Language; onStart: () => void }) {
  const t = copy[language];
  return (
    <div className="dashboard">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="status-chip"><span className="status-dot" /> {language === "fr" ? "Programme prêt" : "Program ready"}</span>
          <h2>{t.ready}</h2>
          <p>{t.subtitle}</p>
          <div className="session-summary">
            <div className="time-medallion"><strong>18</strong><span>min</span></div>
            <div><strong>{t.session}</strong><span>{t.minutes}</span></div>
          </div>
          <button className="primary-button" onClick={onStart}>{t.start}<span aria-hidden="true">→</span></button>
          <button className="text-button">{t.shorter}</button>
        </div>
        <div className="atlas-art" aria-label={language === "fr" ? "Votre atlas de récupération prend forme" : "Your recovery atlas is taking shape"}>
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="atlas-centre"><span>3</span><small>{language === "fr" ? "repères" : "places"}</small></div>
          <div className="atlas-point point-one"><span>V</span><small>{language === "fr" ? "Voix" : "Voice"}</small></div>
          <div className="atlas-point point-two"><span>M</span><small>{language === "fr" ? "Maison" : "Home"}</small></div>
          <div className="atlas-point point-three"><span>I</span><small>{language === "fr" ? "Indépendance" : "Independence"}</small></div>
        </div>
      </section>

      <section className="lower-grid">
        <div className="plan-card">
          <div className="section-heading"><div><p className="eyebrow">{t.plan}</p><h3>{language === "fr" ? "Trois activités simples" : "Three simple activities"}</h3></div><span className="count-badge">3</span></div>
          <Activity index="01" tone="plum" title={t.words} subtitle={t.wordsSub} label={language === "fr" ? "COMMUNICATION" : "COMMUNICATION"} />
          <Activity index="02" tone="blue" title={t.movement} subtitle={t.movementSub} label={language === "fr" ? "MOUVEMENT" : "MOVEMENT"} helper={language === "fr" ? "Quelqu’un doit être près de vous" : "Someone must be nearby"} />
          <Activity index="03" tone="gold" title={t.mission} subtitle={t.missionSub} label={language === "fr" ? "VIE QUOTIDIENNE" : "DAILY LIFE"} />
        </div>

        <aside className="insight-column">
          <div className="rhythm-card">
            <div className="week-dots"><span className="done">L</span><span className="done">M</span><span className="today-dot">M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
            <h3>{t.rhythm}</h3><p className="rhythm-value">{t.rhythmSub}</p><p>{t.noStreak}</p>
          </div>
          <div className="appointment-card">
            <p className="eyebrow">{t.next}</p>
            <div className="appointment-time"><strong>16</strong><span>{language === "fr" ? "JUIL." : "JUL."}<br />10:30</span></div>
            <p>{t.clinician}</p>
          </div>
        </aside>
      </section>
    </div>
  );
}

function Activity({ index, tone, title, subtitle, label, helper }: { index: string; tone: string; title: string; subtitle: string; label: string; helper?: string }) {
  return <div className="activity-row"><div className={`activity-index ${tone}`}>{index}</div><div className="activity-copy"><small>{label}</small><h4>{title}</h4><p>{subtitle}</p>{helper && <span className="helper-label"><span>!</span>{helper}</span>}</div><span className="row-arrow">›</span></div>;
}

function Session({ language, step, setStep, energy, setEnergy, cue, setCue, recording, onRecord, recordingStatus, helper, setHelper, onClose, onBoard, onComplete }: { language: Language; step: SessionStep; setStep: (step: SessionStep) => void; energy: number | null; setEnergy: (n: number) => void; cue: number; setCue: (n: number) => void; recording: boolean; onRecord: () => void; recordingStatus: "idle" | "saving" | "saved" | "error"; helper: boolean; setHelper: (n: boolean) => void; onClose: () => void; onBoard: () => void; onComplete: () => void }) {
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
        <div className="movement-demo"><div className="chair-shape" /><div className="person-shape"><span className="person-head"/><span className="person-body"/></div><span className="demo-label">{language === "fr" ? "Pieds au sol. Penchez-vous vers l’avant." : "Feet on the floor. Lean forward."}</span></div>
        <label className="helper-confirm"><input type="checkbox" checked={helper} onChange={(e) => setHelper(e.target.checked)} /><span className="checkmark">✓</span><span><b>{language === "fr" ? "Mon accompagnateur est prêt" : "My helper is ready"}</b><small>{language === "fr" ? "Il restera près de moi." : "They will stay nearby."}</small></span></label>
        <div className="symptom-row"><span>{language === "fr" ? "Arrêtez si vous avez :" : "Stop if you feel:"}</span><button>{language === "fr" ? "Douleur" : "Pain"}</button><button>{language === "fr" ? "Étourdissement" : "Dizziness"}</button></div>
        <button className="primary-button session-next" disabled={!helper} onClick={next}>{language === "fr" ? "Commencer le mouvement" : "Start movement"}<span>→</span></button>
      </>}
      {step === "mission" && <>
        <p className="eyebrow">{language === "fr" ? "Mission dans la vraie vie" : "Real-life mission"}</p>
        <h2>{language === "fr" ? "Demandez un verre d’eau." : "Ask for a glass of water."}</h2>
        <div className="mission-phrase"><span>“</span><strong>{language === "fr" ? "Je voudrais un verre d’eau, s’il vous plaît." : "I would like a glass of water, please."}</strong></div>
        <p>{language === "fr" ? "Parlez, montrez la phrase ou utilisez votre tableau. Toutes ces façons de communiquer sont valides." : "Speak, point to the phrase, or use your board. All of these ways to communicate are valid."}</p>
        <button className="secondary-button wide-button" onClick={onBoard}>{language === "fr" ? "Ouvrir mon tableau de communication" : "Open my communication board"}</button>
        <button className="primary-button session-next" onClick={() => { onComplete(); next(); }}>{language === "fr" ? "Mission terminée" : "Mission complete"}<span>→</span></button>
      </>}
      {step === "complete" && <div className="complete-state"><div className="complete-mark">✓</div><p className="eyebrow">{language === "fr" ? "Séance terminée" : "Session complete"}</p><h2>{language === "fr" ? "Vous avez fait quelque chose d’important aujourd’hui." : "You did something meaningful today."}</h2><p>{language === "fr" ? "Vous avez pratiqué une phrase utile avec moins d’aide. Votre effort est enregistré." : "You practised a useful phrase with less help. Your effort has been saved."}</p><div className="achievement"><span>+1</span><div><b>{language === "fr" ? "Repère ajouté à votre atlas" : "Place added to your atlas"}</b><small>{language === "fr" ? "Vie quotidienne" : "Daily life"}</small></div></div><button className="primary-button" onClick={onClose}>{language === "fr" ? "Retour à aujourd’hui" : "Back to today"}</button></div>}
    </section>
  </div>;
}

function FamilyPortal({ language, tab, data, dataStatus, setData, setDataStatus }: { language: Language; tab: string; data: ProductData; dataStatus: "loading" | "saved" | "offline"; setData: Dispatch<SetStateAction<ProductData>>; setDataStatus: (status: "loading" | "saved" | "offline") => void }) {
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

  if (tab === "conversations") return <section className="portal-page"><PortalHeading eyebrow={language === "fr" ? "Moments de connexion" : "Moments of connection"} title={language === "fr" ? "Une conversation, pas un test" : "A conversation, not a test"} intro={language === "fr" ? "Choisissez un sujet adulte et familier. Toutes les façons de répondre sont valides." : "Choose a familiar adult topic. Every way of responding is valid."} status={dataStatus} language={language} /><div className="conversation-feature card-surface"><span className="conversation-number">15</span><div><p className="eyebrow">{language === "fr" ? "Suggestion du jour" : "Today’s suggestion"}</p><h2>{language === "fr" ? "Quel endroit aimerais-tu revisiter?" : "Which place would you like to revisit?"}</h2><p>{language === "fr" ? "Utilisez une photo, une carte, un geste ou quelques mots. Ne cherchez pas la réponse parfaite." : "Use a photo, map, gesture, or a few words. Do not look for a perfect answer."}</p><button className="portal-primary">{language === "fr" ? "Commencer la conversation" : "Start conversation"}</button></div></div></section>;

  return <section className="portal-page">
    <PortalHeading eyebrow={language === "fr" ? "Aujourd’hui avec Salah" : "Today with Salah"} title={language === "fr" ? "Votre rôle est clair et simple" : "Your role is clear and simple"} intro={language === "fr" ? "Vous accompagnez le mouvement et offrez le premier indice recommandé — sans transformer la séance en test." : "You support the movement and offer the recommended first cue—without turning the session into a test."} status={dataStatus} language={language} />
    <div className="support-hero">
      <div className="support-focus"><p className="eyebrow">{language === "fr" ? "Objectif du jour" : "Today’s goal"}</p><h2>{language === "fr" ? "Demander un verre d’eau" : "Ask for a glass of water"}</h2><p>{language === "fr" ? "Laissez Salah choisir : parler, montrer la phrase ou ouvrir son tableau." : "Let Salah choose: speak, point to the phrase, or open the board."}</p><div className="cue-callout"><span>1</span><div><b>{language === "fr" ? "Premier indice recommandé" : "Recommended first cue"}</b><p>{language === "fr" ? "Attendez dix secondes, puis demandez : « Est-ce une boisson? »" : "Wait ten seconds, then ask: “Is it a drink?”"}</p></div></div></div>
      <div className="safety-panel"><div className="safety-icon">!</div><p className="eyebrow">{language === "fr" ? "Votre présence est requise" : "Your presence is required"}</p><h3>{language === "fr" ? "Se lever d’une chaise" : "Stand up from a chair"}</h3><p>{data.profile?.supervisionSummary}</p><ul><li>{language === "fr" ? "Restez à portée de main." : "Stay within arm’s reach."}</li><li>{language === "fr" ? "Arrêtez en cas de douleur ou d’étourdissement." : "Stop for pain or dizziness."}</li><li>{language === "fr" ? "Ne modifiez pas le nombre de répétitions." : "Do not change the repetitions."}</li></ul></div>
    </div>
  </section>;
}

function ClinicianPortal({ language, tab, data, dataStatus }: { language: Language; tab: string; data: ProductData; dataStatus: "loading" | "saved" | "offline" }) {
  if (tab === "program") return <section className="portal-page clinician-density"><PortalHeading eyebrow={language === "fr" ? "Programme actif" : "Active program"} title={language === "fr" ? "La séance de Salah" : "Salah’s session"} intro={language === "fr" ? "Ordre, indices et exigences d’assistance sont configurés par l’équipe clinique." : "Order, cues, and assistance requirements are configured by the clinical team."} status={dataStatus} language={language} /><div className="program-table card-surface"><div className="table-head"><span>#</span><span>{language === "fr" ? "Activité" : "Activity"}</span><span>{language === "fr" ? "Assistance" : "Assistance"}</span><span>{language === "fr" ? "Dose" : "Dose"}</span><span>{language === "fr" ? "Révision" : "Review"}</span></div>{(data.program.length ? data.program : fallbackProgram()).map((item) => <div className="table-row" key={item.assignment.id}><span className="order-chip">{item.assignment.orderIndex}</span><span><b>{language === "fr" ? item.exercise.titleFr : item.exercise.titleEn}</b><small>{item.exercise.domain}</small></span><span className={item.exercise.domain === "mobility" ? "assistance-chip warning" : "assistance-chip"}>{item.exercise.assistanceLevel}</span><span>{item.exercise.repetitions}</span><span>{item.exercise.reviewedAt}</span></div>)}</div><div className="clinical-boundary"><span>!</span><p><b>{language === "fr" ? "Progression mobilité protégée" : "Protected mobility progression"}</b><br />{language === "fr" ? "L’assistance, la durée debout et la difficulté d’équilibre ne peuvent être réduites automatiquement." : "Assistance, standing duration, and balance difficulty cannot be reduced automatically."}</p></div></section>;

  if (tab === "results") return <section className="portal-page clinician-density"><PortalHeading eyebrow={language === "fr" ? "Résultats à domicile" : "At-home results"} title={language === "fr" ? "Indépendance et effort" : "Independence and effort"} intro={language === "fr" ? "Les résultats distinguent les réponses indépendantes, les indices utilisés et le transfert fonctionnel." : "Results distinguish independent responses, cues used, and functional transfer."} status={dataStatus} language={language} /><div className="results-layout"><div className="results-chart card-surface"><div className="chart-header"><div><p className="eyebrow">{language === "fr" ? "Dépendance aux indices" : "Cue dependence"}</p><h3>{language === "fr" ? "Moins d’aide au fil du temps" : "Less help over time"}</h3></div><span className="trend-chip">↗ {language === "fr" ? "Amélioration" : "Improving"}</span></div><div className="bar-chart"><ChartBar label="S1" value={32} /><ChartBar label="S2" value={46} /><ChartBar label="S3" value={58} /><ChartBar label="S4" value={72} current /></div><div className="chart-scale"><span>{language === "fr" ? "Modèle complet" : "Full model"}</span><span>{language === "fr" ? "Plus indépendant" : "More independent"}</span></div></div><div className="metric-stack"><Metric value={String(data.attempts.length || 8)} label={language === "fr" ? "séances complétées" : "sessions completed"} detail={language === "fr" ? "4 dernières semaines" : "last 4 weeks"} /><Metric value="3" label={language === "fr" ? "transferts fonctionnels" : "functional transfers"} detail={language === "fr" ? "signalés cette semaine" : "reported this week"} /><Metric value="3/5" label={language === "fr" ? "effort moyen" : "average effort"} detail={language === "fr" ? "gérable selon Salah" : "manageable for Salah"} /></div></div></section>;

  if (tab === "recordings") return <section className="portal-page clinician-density"><PortalHeading eyebrow={language === "fr" ? "Révision autorisée" : "Authorized review"} title={language === "fr" ? "Enregistrements vocaux" : "Voice recordings"} intro={language === "fr" ? "Écoutez uniquement les tentatives que Salah a choisi d’enregistrer. Aucun score automatique n’est présenté comme une évaluation clinique." : "Listen only to attempts Salah chose to record. No automatic score is presented as a clinical assessment."} status={dataStatus} language={language} /><div className="recording-review-list">{data.mediaAssets.filter((asset) => asset.reviewStatus !== "deleted").length ? data.mediaAssets.filter((asset) => asset.reviewStatus !== "deleted").map((asset, index) => <div className="recording-review-card card-surface" key={asset.id}><div className="recording-order">{String(index + 1).padStart(2, "0")}</div><div className="recording-meta"><p className="eyebrow">{language === "fr" ? "Mot personnel · Café" : "Personal word · Coffee"}</p><h3>{language === "fr" ? "Tentative de Salah" : "Salah’s attempt"}</h3><small>{new Date(asset.createdAt).toLocaleString(language === "fr" ? "fr-CA" : "en-CA")} · {asset.durationMs ? `${Math.max(1, Math.round(asset.durationMs / 1000))} s` : "—"}</small></div><audio controls preload="none" src={`/api/media?id=${encodeURIComponent(asset.id)}`} aria-label={language === "fr" ? "Lire l’enregistrement" : "Play recording"} /><div className="review-actions"><span className={asset.reviewStatus === "new" ? "review-new" : "review-done"}>{asset.reviewStatus === "new" ? (language === "fr" ? "Nouveau" : "New") : (language === "fr" ? "Révisé" : "Reviewed")}</span><button>{language === "fr" ? "Ajouter une note" : "Add note"}</button></div></div>) : <div className="card-surface"><EmptyState text={language === "fr" ? "Aucun enregistrement autorisé. Les tentatives apparaîtront ici après le consentement et l’enregistrement de Salah." : "No authorized recordings. Attempts will appear here after Salah consents and records one."} /></div>}</div><div className="clinical-boundary"><span>i</span><p><b>{language === "fr" ? "Interprétation clinique requise" : "Clinical interpretation required"}</b><br />{language === "fr" ? "La lecture et la comparaison soutiennent votre jugement; Élan ne déclare pas une prononciation correcte ou incorrecte." : "Playback and comparison support your judgment; Élan does not declare pronunciation correct or incorrect."}</p></div></section>;

  if (tab === "observations") return <section className="portal-page clinician-density"><PortalHeading eyebrow={language === "fr" ? "Partenaires et domicile" : "Partners and home"} title={language === "fr" ? "Observations à réviser" : "Observations to review"} intro={language === "fr" ? "Les observations familiales restent distinctes des mesures cliniques jusqu’à votre révision." : "Family observations remain separate from clinical measures until you review them."} status={dataStatus} language={language} /><div className="review-list card-surface">{data.observations.length ? data.observations.map((observation) => <div className="review-row" key={observation.id}><span className={`category-dot ${observation.category}`} /><div><p className="eyebrow">{observation.category} · {observation.authorName}</p><b>{observation.note}</b><small>{new Date(observation.createdAt).toLocaleDateString(language === "fr" ? "fr-CA" : "en-CA")}</small></div><button>{language === "fr" ? "Réviser" : "Review"}</button></div>) : <EmptyState text={language === "fr" ? "Aucune nouvelle observation. Les notes de Sylvie apparaîtront ici." : "No new observations. Sylvie’s notes will appear here."} />}</div></section>;

  return <section className="portal-page clinician-density">
    <PortalHeading eyebrow={language === "fr" ? "Patient actif · SAL-0042" : "Active patient · SAL-0042"} title={language === "fr" ? "Plan interdisciplinaire" : "Interdisciplinary plan"} intro={data.profile?.primaryGoal ?? ""} status={dataStatus} language={language} />
    <div className="patient-overview card-surface"><div className="patient-avatar">SL</div><div className="patient-summary"><h2>Salah L.</h2><p>{language === "fr" ? "Aphasie acquise · Français · Programme à domicile" : "Acquired aphasia · French · Home program"}</p><div className="patient-tags"><span>{language === "fr" ? "Tablette" : "Tablet"}</span><span>{language === "fr" ? "Partenaire connecté" : "Connected partner"}</span><span className="warning">{language === "fr" ? "Supervision debout" : "Standing supervision"}</span></div></div><div className="next-review"><p className="eyebrow">{language === "fr" ? "Prochaine révision" : "Next review"}</p><strong>16</strong><span>{language === "fr" ? "JUILLET" : "JULY"}</span></div></div>
    <div className="goal-grid">{data.goals.map((goal) => <div className="goal-card" key={goal.id}><span className={`goal-domain ${goal.domain}`}>{goal.domain === "communication" ? "C" : goal.domain === "mobility" ? "M" : "V"}</span><p className="eyebrow">{goal.domain}</p><h3>{goal.title}</h3><p>{goal.progressNote}</p><div className="goal-footer"><span className="active-status">{language === "fr" ? "Actif" : "Active"}</span><small>{language === "fr" ? "Révision" : "Review"} {goal.reviewDate.slice(5).replace("-", "/")}</small></div></div>)}</div>
  </section>;
}

function PortalHeading({ eyebrow, title, intro, status, language }: { eyebrow: string; title: string; intro: string; status: "loading" | "saved" | "offline"; language: Language }) { return <div className="portal-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{intro}</p></div><span className={`data-status ${status}`}><i />{status === "loading" ? (language === "fr" ? "Chargement" : "Loading") : status === "saved" ? (language === "fr" ? "Données synchronisées" : "Data synced") : (language === "fr" ? "Mode hors ligne" : "Offline mode")}</span></div>; }
function GuidanceCard({ number, title, text }: { number: string; title: string; text: string }) { return <div className="guidance-card"><span>{number}</span><h3>{title}</h3><p>{text}</p></div>; }
function EmptyState({ text }: { text: string }) { return <div className="empty-state"><span>· · ·</span><p>{text}</p></div>; }
function ChartBar({ label, value, current }: { label: string; value: number; current?: boolean }) { return <div className="chart-bar"><div><span style={{ height: `${value}%` }} className={current ? "current" : ""}><b>{value}%</b></span></div><small>{label}</small></div>; }
function Metric({ value, label, detail }: { value: string; label: string; detail: string }) { return <div className="metric-card"><strong>{value}</strong><b>{label}</b><small>{detail}</small></div>; }
function fallbackProgram(): ProductData["program"] { return [
  { assignment: { id: "a1", status: "assigned", orderIndex: 1 }, exercise: { id: "e1", domain: "communication", titleFr: "Mes mots importants", titleEn: "My important words", assistanceLevel: "Indices gradués", repetitions: "3 mots", clinicianName: "Marie-Claude", reviewedAt: "2026-07-10" } },
  { assignment: { id: "a2", status: "assigned", orderIndex: 2 }, exercise: { id: "e2", domain: "mobility", titleFr: "Se lever d’une chaise", titleEn: "Stand up from a chair", assistanceLevel: "Quelqu’un à proximité", repetitions: "5 répétitions", clinicianName: "Karim B.", reviewedAt: "2026-07-11" } },
  { assignment: { id: "a3", status: "assigned", orderIndex: 3 }, exercise: { id: "e3", domain: "participation", titleFr: "Mission dans la cuisine", titleEn: "Kitchen mission", assistanceLevel: "Partenaire disponible", repetitions: "1 mission", clinicianName: "Marie-Claude", reviewedAt: "2026-07-10" } },
]; }

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

function Practice({ language, onStart }: { language: Language; onStart: () => void }) {
  return <section className="content-view"><p className="eyebrow">{language === "fr" ? "Bibliothèque personnelle" : "Personal library"}</p><h2>{language === "fr" ? "Pratiquer à votre rythme" : "Practice at your pace"}</h2><p className="view-intro">{language === "fr" ? "Contenu choisi avec votre équipe de soins." : "Content chosen with your care team."}</p><div className="library-grid"><button onClick={onStart}><span className="library-mark plum">M</span><b>{language === "fr" ? "Mes mots" : "My words"}</b><small>{language === "fr" ? "12 mots personnels" : "12 personal words"}</small></button><button><span className="library-mark blue">P</span><b>{language === "fr" ? "Mes phrases" : "My phrases"}</b><small>{language === "fr" ? "4 situations utiles" : "4 useful situations"}</small></button><button><span className="library-mark gold">B</span><b>{language === "fr" ? "Bouger" : "Move"}</b><small>{language === "fr" ? "2 exercices approuvés" : "2 approved exercises"}</small></button></div></section>;
}

function SimpleView({ language, view, onBoard }: { language: Language; view: View; onBoard: () => void }) {
  const isHelp = view === "help";
  return <section className="content-view"><p className="eyebrow">Élan</p><h2>{isHelp ? (language === "fr" ? "Vous n’êtes jamais seul." : "You are never alone.") : (language === "fr" ? "Communiquez à votre façon." : "Communicate your way.")}</h2><p className="view-intro">{isHelp ? (language === "fr" ? "Demandez de l’aide, écoutez les instructions ou contactez votre équipe." : "Ask for help, listen to instructions, or contact your team.") : (language === "fr" ? "Parler n’est qu’une façon de se faire comprendre." : "Speaking is only one way to be understood.")}</p><div className="support-cards"><button onClick={onBoard}><span>•••</span><b>{language === "fr" ? "Tableau de communication" : "Communication board"}</b><small>{language === "fr" ? "Messages essentiels, même hors ligne" : "Essential messages, even offline"}</small></button><button><span>i</span><b>{language === "fr" ? "Appeler un proche" : "Call a family member"}</b><small>{language === "fr" ? "Sylvie est votre contact principal" : "Sylvie is your primary contact"}</small></button></div></section>;
}
