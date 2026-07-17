"use client";

import { useState, type FormEvent } from "react";
import type { ActorRole } from "../../lib/session";

const accounts: Array<{ role: ActorRole; label: string; detail: string; emoji: string }> = [
  { role: "patient", label: "Salah", detail: "Mon espace de réadaptation", emoji: "🌱" },
  { role: "family", label: "Proche", detail: "Accompagner et ajouter des notes", emoji: "🤝" },
  { role: "admin", label: "Administration", detail: "Gérer le plan de Salah", emoji: "🗂️" },
];

export default function LoginForm() {
  const [role, setRole] = useState<ActorRole>("patient");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Connexion impossible");
      window.location.assign("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Connexion impossible");
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-stage">
        <aside className="login-story" aria-hidden="true">
          <div className="login-story-blob" />
          <span className="login-story-mark">é</span>
          <p className="login-story-tagline">Votre réadaptation,<br />simplement.</p>
          <p className="login-story-sub">Des séances guidées, un tableau pour communiquer et un plan partagé — à votre rythme, chaque jour.</p>
        </aside>
        <section className="login-card" aria-labelledby="login-title">
          <div className="login-brand"><span aria-hidden="true">é</span>Élan</div>
          <p className="eyebrow">Votre réadaptation, simplement</p>
          <h1 id="login-title">Bienvenue</h1>
          <p className="login-intro">Choisissez votre espace pour continuer.</p>
          <form onSubmit={signIn}>
            <fieldset>
              <legend>Mon espace</legend>
              <div className="login-accounts">
                {accounts.map((account) => (
                  <label key={account.role} className={role === account.role ? "login-account selected" : "login-account"}>
                    <input type="radio" name="role" value={account.role} checked={role === account.role} onChange={() => setRole(account.role)} />
                    <span className="login-avatar" aria-hidden="true">{account.emoji}</span>
                    <span><strong>{account.label}</strong><small>{account.detail}</small></span>
                    <span className="login-account-arrow" aria-hidden="true">{role === account.role ? "✓" : ""}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit" disabled={submitting}>{submitting ? "Connexion…" : "Entrer dans Élan"}<span aria-hidden="true">→</span></button>
          </form>
        </section>
      </div>
    </main>
  );
}
