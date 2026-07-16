# Élan

Élan is a bilingual, accessible rehabilitation companion for a patient, a family member, and the care-plan administrator. It runs as a standard Next.js application on Vercel.

## Local development

Requirements: Node.js 22.13 or later.

```bash
npm install
npm run convex:dev
```

In a second terminal:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Choose the patient, family, or administration space directly. Convex stores plan changes, completed sessions, progress attempts, observations, and consent choices.

The configured development deployment is `https://mellow-bullfrog-769.convex.cloud`.

## Deploy to Vercel

1. Import `ahlembiz/elan` into Vercel and keep the framework preset set to **Next.js**.
2. Leave **Output Directory** empty. Next.js generates `.next` automatically.
3. Add `ELAN_SESSION_SECRET`, `NEXT_PUBLIC_CONVEX_URL`, and `ELAN_CONVEX_API_SECRET` from `.env.example`.
4. Deploy the Convex functions with `npm run convex:deploy`.
5. Deploy the Next.js application. The server routes connect to Convex and generate one stable daily session per patient and Toronto calendar date.

No custom Output Directory or Cloudflare binding is required. `vercel.json` selects the Next.js framework and the deployment build command.

## Commands

- `npm run dev` — start Next.js
- `npm run convex:dev` — typecheck and sync Convex functions during development
- `npm run convex:deploy` — deploy Convex functions
- `npm run lint` — run the Next.js ESLint rules
- `npm test` — build and run product regression checks
- `npm run build` — run the same native Next.js compiler used by Vercel
- `npm run vercel-build` — validate Vercel variables, migrate Turso, and build
- `npm run db:generate` — generate a migration after a schema change
- `npm run db:migrate` — apply legacy SQLite migrations if using the optional fallback

## Data and security notes

- Server routes derive the actor role and identity from a signed, HTTP-only session; the browser cannot choose its own write role.
- Recording objects use private Blob access and are streamed only through an authorized API route.
- Convex stores progress, plan state, observations, and consent choices. Daily sessions are generated deterministically from the clinical exercise catalog, so the session changes with the Toronto date but remains stable throughout that day.
- The legacy SQLite/Turso adapter remains available as a fallback during the migration period but is no longer required for the main application.
- The current role selector is appropriate only for a controlled prototype and is not identity authentication. Before storing live clinical records, integrate an identity provider with account recovery and MFA, complete privacy/security review, and confirm regional data-processing requirements.
