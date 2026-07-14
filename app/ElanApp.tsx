"use client";

import { useMemo, useState } from "react";

type Language = "fr" | "en";
type View = "today" | "communicate" | "practice" | "progress" | "help";
type SessionStep = "checkin" | "words" | "movement" | "mission" | "complete";

const copy = {
  fr: {
    today: "Aujourd’hui",
    communicate: "Communiquer",
    practice: "Pratiquer",
    progress: "Mes progrès",
    help: "Aide",
    greeting: "Bonjour, Michel",
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
    greeting: "Hello, Michel",
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
  const [view, setView] = useState<View>("today");
  const [boardOpen, setBoardOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionStep, setSessionStep] = useState<SessionStep>("checkin");
  const [energy, setEnergy] = useState<number | null>(null);
  const [cue, setCue] = useState(0);
  const [recording, setRecording] = useState(false);
  const [helper, setHelper] = useState(false);
  const [spoken, setSpoken] = useState<string | null>(null);
  const t = copy[language];

  const nav = useMemo(() => [
    { id: "today" as View, label: t.today, mark: "A" },
    { id: "communicate" as View, label: t.communicate, mark: "C" },
    { id: "practice" as View, label: t.practice, mark: "P" },
    { id: "progress" as View, label: t.progress, mark: "M" },
    { id: "help" as View, label: t.help, mark: "?" },
  ], [t]);

  const beginSession = () => {
    setSessionStep("checkin");
    setSessionOpen(true);
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
            <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => { setView(item.id); setSessionOpen(false); if (item.id === "communicate") setBoardOpen(true); }}>
              <span className="nav-mark" aria-hidden="true">{item.mark}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button className="profile-pill" aria-label={language === "fr" ? "Profil de Michel" : "Michel’s profile"}>
          <span>MG</span>
          <span className="profile-copy">Michel<br /><small>{language === "fr" ? "Mon profil" : "My profile"}</small></span>
        </button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">{t.goodMorning}</p>
            <h1>{sessionOpen ? (language === "fr" ? "Ma séance" : "My session") : t.greeting}</h1>
          </div>
          <div className="top-actions">
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
            setRecording={setRecording}
            helper={helper}
            setHelper={setHelper}
            onClose={() => setSessionOpen(false)}
            onBoard={() => setBoardOpen(true)}
          />
        ) : view === "today" ? (
          <Today language={language} onStart={beginSession} />
        ) : view === "progress" ? (
          <Progress language={language} />
        ) : view === "practice" ? (
          <Practice language={language} onStart={beginSession} />
        ) : (
          <SimpleView language={language} view={view} onBoard={() => setBoardOpen(true)} />
        )}
      </main>

      <button className="quick-board" onClick={() => setBoardOpen(true)}>
        <span aria-hidden="true">•••</span>
        {t.board}
      </button>

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

function Session({ language, step, setStep, energy, setEnergy, cue, setCue, recording, setRecording, helper, setHelper, onClose, onBoard }: { language: Language; step: SessionStep; setStep: (step: SessionStep) => void; energy: number | null; setEnergy: (n: number) => void; cue: number; setCue: (n: number) => void; recording: boolean; setRecording: (n: boolean) => void; helper: boolean; setHelper: (n: boolean) => void; onClose: () => void; onBoard: () => void }) {
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
        <div className="word-actions"><button className="secondary-button" onClick={() => setCue(Math.min(cue + 1, 3))}>+ {language === "fr" ? "Un indice" : "A cue"}</button><button className={recording ? "record-button recording" : "record-button"} onClick={() => setRecording(!recording)}><span />{recording ? (language === "fr" ? "Arrêter" : "Stop") : (language === "fr" ? "Enregistrer" : "Record")}</button></div>
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
        <button className="primary-button session-next" onClick={next}>{language === "fr" ? "Mission terminée" : "Mission complete"}<span>→</span></button>
      </>}
      {step === "complete" && <div className="complete-state"><div className="complete-mark">✓</div><p className="eyebrow">{language === "fr" ? "Séance terminée" : "Session complete"}</p><h2>{language === "fr" ? "Vous avez fait quelque chose d’important aujourd’hui." : "You did something meaningful today."}</h2><p>{language === "fr" ? "Vous avez pratiqué une phrase utile avec moins d’aide. Votre effort est enregistré." : "You practised a useful phrase with less help. Your effort has been saved."}</p><div className="achievement"><span>+1</span><div><b>{language === "fr" ? "Repère ajouté à votre atlas" : "Place added to your atlas"}</b><small>{language === "fr" ? "Vie quotidienne" : "Daily life"}</small></div></div><button className="primary-button" onClick={onClose}>{language === "fr" ? "Retour à aujourd’hui" : "Back to today"}</button></div>}
    </section>
  </div>;
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
