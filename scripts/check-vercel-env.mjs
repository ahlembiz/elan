const required = ["ELAN_SESSION_SECRET", "NEXT_PUBLIC_CONVEX_URL", "ELAN_CONVEX_API_SECRET"];

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
  "Vercel environment is configured with Convex persistence.\n",
);
