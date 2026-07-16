"use client";

import { useState, type FormEvent } from "react";
import type { ActorRole } from "../../lib/session";

const accounts: Array<{ role: ActorRole; label: string; detail: string; initials: string }> = [
  { role: "patient", label: "Salah", detail: "Mon espace de réadaptation", initials: "SL" },
  { role: "family", label: "Proche", detail: "Accompagner et ajouter des notes", initials: "PR" },
  { role: "admin", label: "Administration", detail: "Gérer le plan de Salah", initials: "ÉA" },
];

export default function LoginForm() {
  const [role, setRole] = useState<ActorRole>("patient");
  const [code, setCode] = useState("");
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
        body: JSON.stringify({ role, code }),
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
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand"><span aria-hidden="true">é</span>Élan</div>
        <p className="eyebrow">Votre réadaptation, simplement</p>
        <h1 id="login-title">Bienvenue</h1>
        <p className="login-intro">Choisissez votre espace, puis entrez votre code d’accès.</p>
        <form onSubmit={signIn}>
          <fieldset>
            <legend>Mon espace</legend>
            <div className="login-accounts">
              {accounts.map((account) => (
                <label key={account.role} className={role === account.role ? "login-account selected" : "login-account"}>
                  <input type="radio" name="role" value={account.role} checked={role === account.role} onChange={() => setRole(account.role)} />
                  <span className="login-avatar" aria-hidden="true">{account.initials}</span>
                  <span><strong>{account.label}</strong><small>{account.detail}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="login-code">
            <span>Code d’accès</span>
            <input type="password" inputMode="numeric" autoComplete="current-password" value={code} onChange={(event) => setCode(event.target.value)} required minLength={6} autoFocus />
          </label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="login-submit" type="submit" disabled={submitting}>{submitting ? "Connexion…" : "Entrer dans Élan"}</button>
        </form>
        {process.env.NODE_ENV !== "production" && <p className="login-development">Développement local : Salah 11111111 · Proche 22222222 · Administration 33333333</p>}
      </section>
    </main>
  );
}
