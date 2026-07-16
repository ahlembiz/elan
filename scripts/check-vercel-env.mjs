const required = [
  "ELAN_SESSION_SECRET",
  "ELAN_PATIENT_CODE",
  "ELAN_FAMILY_CODE",
  "ELAN_ADMIN_CODE",
];

if (!process.env.VERCEL) {
  process.stdout.write("Local build: Vercel environment validation skipped.\n");
  process.exit(0);
}

const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  throw new Error(`Missing required Vercel environment variables: ${missing.join(", ")}`);
}

if (process.env.ELAN_SESSION_SECRET.length < 32) {
  throw new Error("ELAN_SESSION_SECRET must contain at least 32 characters.");
}

for (const name of ["ELAN_PATIENT_CODE", "ELAN_FAMILY_CODE", "ELAN_ADMIN_CODE"]) {
  if (process.env[name].length < 8) {
    throw new Error(`${name} must contain at least 8 characters.`);
  }
}

process.stdout.write(
  process.env.TURSO_DATABASE_URL
    ? "Vercel environment is configured with durable database storage.\n"
    : "Vercel environment is configured in frontend-only mode.\n",
);
