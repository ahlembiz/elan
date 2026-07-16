const required = ["ELAN_SESSION_SECRET"];

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

process.stdout.write(
  process.env.TURSO_DATABASE_URL
    ? "Vercel environment is configured with durable database storage.\n"
    : "Vercel environment is configured in frontend-only mode.\n",
);
