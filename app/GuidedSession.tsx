"use client";

import { useMemo, useState } from "react";
import { exerciseCatalog } from "./api/plan/exerciseCatalog";

export type GuidedSessionEntry = {
  id: string;
  titleFr: string;
  titleEn: string;
  descriptionFr: string;
  descriptionEn: string;
  assistanceFr?: string;
  assistanceEn?: string;
  evidenceTitle: string | null;
  evidenceUrl: string | null;
  safetyClass: "standard" | "supervised" | "clinical_review";
  durationMinutes?: number;
  effortLevel?: number;
  status: "active" | "completed" | "paused";
  exerciseLibraryId: string | null;
};

export type GuidedSessionData = {
  id: string;
  kind?: "daily" | "custom";
  sessionDate?: string;
  titleFr: string;
  titleEn: string;
  targetDuration: number;
  effortLevel: number;
  status: "active" | "completed" | "paused";
  entries: GuidedSessionEntry[];
};

type Language = "fr" | "en";
type Phase = "introduction" | "exercise" | "complete";

export default function GuidedSession({
  language,
  session,
  onEntryComplete,
  onSessionComplete,
  onExit,
  onOpenReplacement,
}: {
  language: Language;
  session: GuidedSessionData;
  onEntryComplete: (entry: GuidedSessionEntry) => Promise<void>;
  onSessionComplete: (session: GuidedSessionData) => Promise<GuidedSessionData | null>;
  onExit: () => void;
  onOpenReplacement?: (session: GuidedSessionData) => void;
}) {
  const firstActive = Math.max(0, session.entries.findIndex((entry) => entry.status !== "completed"));
  const [phase, setPhase] = useState<Phase>(session.status === "completed" ? "complete" : "introduction");
  const [stepIndex, setStepIndex] = useState(firstActive);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [replacement, setReplacement] = useState<GuidedSessionData | null>(null);

  const entry = session.entries[stepIndex];
  const template = entry?.exerciseLibraryId ? exerciseCatalog.find((item) => item.id === entry.exerciseLibraryId) : undefined;
  const practicePhrase = language === "fr" ? template?.practicePhraseFr : template?.practicePhraseEn;
  const practiceWords = (language === "fr" ? template?.practiceWordsFr : template?.practiceWordsEn) ?? [];
  const completedBefore = session.entries.filter((item, index) => index < stepIndex || item.status === "completed").length;
  const progress = phase === "complete"
    ? 100
    : phase === "introduction"
      ? Math.round((completedBefore / Math.max(1, session.entries.length)) * 100)
      : Math.round(((stepIndex + 1) / Math.max(1, session.entries.length)) * 100);
  const needsConfirmation = entry?.safetyClass === "supervised" || entry?.safetyClass === "clinical_review";

  const labels = useMemo(() => language === "fr" ? {
    session: "Séance guidée",
    ready: "Votre séance est prête.",
    intro: "Vous verrez une activité à la fois. Prenez tout le temps nécessaire et faites une pause dès que vous en avez besoin.",
    total: "Durée prévue",
    effort: "Effort choisi",
    activities: "activités",
    start: firstActive > 0 ? "Continuer ma séance" : "Commencer ma séance",
    exit: "Faire une pause et quitter",
    back: "Étape précédente",
    step: "Activité",
    of: "sur",
    instructions: "Ce que je fais",
    assistance: "Aide prévue",
    standardHelp: "Suivez les consignes de votre plan. Une autre façon de communiquer est toujours valide.",
    safety: "Sécurité",
    supervised: "Faites cette activité seulement avec l’aide indiquée. Arrêtez en cas de douleur, d’étourdissement, d’essoufflement inhabituel ou de nouveau symptôme.",
    review: "Faites cette activité seulement si votre équipe de soins l’a approuvée pour vous.",
    confirmSupervised: "La personne qui doit m’aider est présente.",
    confirmReview: "Cette activité a été approuvée par mon équipe de soins.",
    research: "Voir la source clinique",
    listen: "Écouter la consigne",
    phrase: "Votre phrase à pratiquer",
    words: "Vos mots à pratiquer",
    listenPhrase: "Écouter la phrase",
    tapWord: "Touchez un mot pour l’écouter",
    completed: "J’ai terminé cette activité",
    saving: "Enregistrement…",
    saved: "Activité enregistrée.",
    error: "La progression n’a pas pu être enregistrée. Vérifiez la connexion et réessayez.",
    done: "Séance terminée",
    achievement: "Vous avez terminé toutes les activités, à votre rythme.",
    replacementReady: "Une nouvelle séance différente est déjà prête pour vous.",
    customDone: "Votre progression a été enregistrée dans Mon plan.",
    nextSession: "Voir ma nouvelle séance",
    home: "Retour à l’accueil",
  } : {
    session: "Guided session",
    ready: "Your session is ready.",
    intro: "You will see one activity at a time. Take all the time you need and pause whenever you need to.",
    total: "Planned time",
    effort: "Chosen effort",
    activities: "activities",
    start: firstActive > 0 ? "Continue my session" : "Start my session",
    exit: "Pause and leave",
    back: "Previous step",
    step: "Activity",
    of: "of",
    instructions: "What to do",
    assistance: "Planned support",
    standardHelp: "Follow the instructions in your plan. Another way of communicating is always valid.",
    safety: "Safety",
    supervised: "Do this activity only with the stated support. Stop for pain, dizziness, unusual shortness of breath, or a new symptom.",
    review: "Do this activity only if your care team has approved it for you.",
    confirmSupervised: "The person who needs to help me is here.",
    confirmReview: "My care team has approved this activity.",
    research: "View the clinical source",
    listen: "Listen to the instructions",
    phrase: "Your phrase to practise",
    words: "Your words to practise",
    listenPhrase: "Hear the phrase",
    tapWord: "Tap a word to hear it",
    completed: "I completed this activity",
    saving: "Saving…",
    saved: "Activity saved.",
    error: "Progress could not be saved. Check the connection and try again.",
    done: "Session complete",
    achievement: "You completed every activity at your own pace.",
    replacementReady: "A different new session is already ready for you.",
    customDone: "Your progress has been saved in My plan.",
    nextSession: "View my new session",
    home: "Back to home",
  }, [firstActive, language]);

  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "fr" ? "fr-CA" : "en-CA";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const speakEntry = () => {
    if (!entry) return;
    speakText(`${language === "fr" ? entry.titleFr : entry.titleEn}. ${language === "fr" ? entry.descriptionFr : entry.descriptionEn}`);
  };

  const completeEntry = async () => {
    if (!entry || saving || (needsConfirmation && !safetyConfirmed)) return;
    setSaving(true);
    setError("");
    try {
      await onEntryComplete(entry);
      const isLast = stepIndex >= session.entries.length - 1;
      if (isLast) {
        const nextSession = await onSessionComplete(session);
        setReplacement(nextSession);
        setPhase("complete");
      } else {
        setStepIndex((current) => current + 1);
        setSafetyConfirmed(false);
      }
    } catch {
      setError(labels.error);
    } finally {
      setSaving(false);
    }
  };

  if (!session.entries.length) {
    return <section className="guided-session-shell"><div className="guided-session-card"><h2>{labels.ready}</h2><p>{labels.error}</p><button className="guided-primary" onClick={onExit}>{labels.home}</button></div></section>;
  }

  return <section className="guided-session-shell" aria-labelledby="guided-session-title">
    <div className="guided-session-progress" aria-label={`${progress}%`}>
      <span style={{ width: `${progress}%` }} />
    </div>
    <div className="guided-step-dots" aria-hidden="true">
      {session.entries.map((item, index) => <span key={item.id} className={item.status === "completed" || phase === "complete" ? "done" : phase === "exercise" && index === stepIndex ? "current" : ""} />)}
    </div>
    <div className="guided-session-topbar">
      <span>{phase === "exercise" ? `${labels.step} ${stepIndex + 1} ${labels.of} ${session.entries.length}` : labels.session}</span>
      <button type="button" onClick={onExit}>{labels.exit}</button>
    </div>

    {phase === "introduction" && <article className="guided-session-card guided-introduction">
      <p className="eyebrow">{labels.session}</p>
      <h2 id="guided-session-title">{labels.ready}</h2>
      <p className="guided-lead">{labels.intro}</p>
      <div className="guided-session-facts">
        <span><b>{session.targetDuration} min</b><small>{labels.total}</small></span>
        <span><b>{session.effortLevel}/5</b><small>{labels.effort}</small></span>
        <span><b>{session.entries.length}</b><small>{labels.activities}</small></span>
      </div>
      <ol className="guided-session-outline">
        {session.entries.map((item, index) => <li key={item.id} className={item.status === "completed" ? "completed" : ""}>
          <span>{item.status === "completed" ? "✓" : index + 1}</span>
          <div><b>{language === "fr" ? item.titleFr : item.titleEn}</b><small>{item.durationMinutes ? `${item.durationMinutes} min` : ""}</small></div>
        </li>)}
      </ol>
      <button className="guided-primary" type="button" onClick={() => setPhase("exercise")}>{labels.start}<span aria-hidden="true">→</span></button>
    </article>}

    {phase === "exercise" && entry && <article key={entry.id} className="guided-session-card guided-exercise">
      <div className="guided-step-count" aria-live="polite">{labels.step} <strong>{stepIndex + 1}</strong> {labels.of} {session.entries.length}</div>
      <p className="eyebrow">{labels.instructions}</p>
      <h2 id="guided-session-title">{language === "fr" ? entry.titleFr : entry.titleEn}</h2>
      <button className="guided-listen" type="button" onClick={speakEntry}><span aria-hidden="true">🔊</span>{labels.listen}</button>

      {practicePhrase && <div className="guided-phrase">
        <small>{labels.phrase}</small>
        <strong>« {practicePhrase} »</strong>
        <button type="button" onClick={() => speakText(practicePhrase)}><span aria-hidden="true">🔊</span>{labels.listenPhrase}</button>
      </div>}

      {practiceWords.length > 0 && <div className="guided-words">
        <small>{labels.words} · {labels.tapWord}</small>
        <div>{practiceWords.map((word) => <button key={word} type="button" onClick={() => speakText(word)}><span aria-hidden="true">🔊</span>{word}</button>)}</div>
      </div>}

      <p className="guided-instructions">{language === "fr" ? entry.descriptionFr : entry.descriptionEn}</p>

      <div className="guided-support">
        <span aria-hidden="true">i</span>
        <div><b>{labels.assistance}</b><p>{language === "fr" ? entry.assistanceFr || labels.standardHelp : entry.assistanceEn || labels.standardHelp}</p></div>
      </div>

      {needsConfirmation && <div className={`guided-safety ${entry.safetyClass}`} role="note">
        <span aria-hidden="true">!</span>
        <div><b>{labels.safety}</b><p>{entry.safetyClass === "supervised" ? labels.supervised : labels.review}</p></div>
      </div>}

      {needsConfirmation && <label className="guided-confirmation">
        <input type="checkbox" checked={safetyConfirmed} onChange={(event) => setSafetyConfirmed(event.target.checked)} />
        <span>{entry.safetyClass === "supervised" ? labels.confirmSupervised : labels.confirmReview}</span>
      </label>}

      {entry.evidenceUrl && <details className="info-disclosure inline">
        <summary><span aria-hidden="true">i</span>{labels.research}</summary>
        <div><a href={entry.evidenceUrl} target="_blank" rel="noreferrer">{entry.evidenceTitle} ↗</a></div>
      </details>}

      <div className="guided-actions">
        {stepIndex > 0 && <button className="guided-back" type="button" onClick={() => { setStepIndex((current) => current - 1); setSafetyConfirmed(false); }} disabled={saving}>← {labels.back}</button>}
        <button className="guided-primary" type="button" onClick={completeEntry} disabled={saving || (needsConfirmation && !safetyConfirmed)}>
          {saving ? labels.saving : labels.completed}<span aria-hidden="true">✓</span>
        </button>
      </div>
      <div className="guided-save-status" aria-live="polite">{error || (!saving && stepIndex > firstActive ? labels.saved : "")}</div>
    </article>}

    {phase === "complete" && <article className="guided-session-card guided-complete">
      <div className="guided-complete-mark" aria-hidden="true">✓<span className="guided-celebration"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></span></div>
      <p className="eyebrow">{labels.done}</p>
      <h2 id="guided-session-title">{labels.achievement}</h2>
      <p>{replacement ? labels.replacementReady : labels.customDone}</p>
      <div className="guided-reward"><strong>+{session.entries.length * 20}</strong><span>{language === "fr" ? "points d’élan enregistrés" : "momentum points saved"}</span></div>
      {replacement && onOpenReplacement
        ? <button className="guided-primary" type="button" onClick={() => onOpenReplacement(replacement)}>{labels.nextSession}<span aria-hidden="true">→</span></button>
        : <button className="guided-primary" type="button" onClick={onExit}>{labels.home}<span aria-hidden="true">→</span></button>}
      {replacement && <button className="guided-complete-home" type="button" onClick={onExit}>{labels.home}</button>}
    </article>}
  </section>;
}
