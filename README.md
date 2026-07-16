# Élan

Élan is a bilingual, accessible rehabilitation companion for a patient, a family member, and the care-plan administrator. It runs as a standard Next.js application on Vercel.

## Local development

Requirements: Node.js 22.13 or later.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Local development uses `.data/elan.db` and `.data/media/`; both are ignored by Git. The local access codes are:

- patient: `11111111`
- family: `22222222`
- administration: `33333333`

To test with cloud services, copy `.env.example` to `.env.local` and fill in the values.

## Deploy to Vercel

1. Import `ahlembiz/elan` into Vercel and keep the framework preset set to **Next.js**.
2. Leave **Output Directory** empty. Next.js generates `.next` automatically.
3. Add a Turso integration to the project. It must provide `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
4. Create a **Private Vercel Blob** store connected to the project. It must provide `BLOB_READ_WRITE_TOKEN`.
5. Add the authentication variables from `.env.example` for Production, Preview, and Development. Generate `ELAN_SESSION_SECRET` with at least 32 random characters and use a different access code of at least eight characters for each role.
6. Deploy. Vercel runs `npm run vercel-build`, validates the environment, applies pending SQLite migrations to Turso, and executes the native `next build`.

No custom Output Directory or Cloudflare binding is required. `vercel.json` selects the Next.js framework and the deployment build command.

## Commands

- `npm run dev` — apply local migrations and start Next.js
- `npm run lint` — run the Next.js ESLint rules
- `npm test` — migrate, build, and run product regression checks
- `npm run build` — run the same native Next.js compiler used by Vercel
- `npm run vercel-build` — validate Vercel variables, migrate Turso, and build
- `npm run db:generate` — generate a migration after a schema change
- `npm run db:migrate` — apply pending migrations

## Data and security notes

- Server routes derive the actor role and identity from a signed, HTTP-only session; the browser cannot choose its own write role.
- Recording objects use private Blob access and are streamed only through an authorized API route.
- Local storage is a development fallback only; Vercel deployments fail early if Turso, Blob, or authentication secrets are absent.
- This access-code flow is appropriate for a controlled pilot. Before storing live clinical records at scale, integrate an identity provider with account recovery and MFA, complete privacy/security review, and confirm regional data-processing requirements.
