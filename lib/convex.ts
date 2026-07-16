import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

let client: ConvexHttpClient | null = null;

export function hasConvex() {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL);
}

function getClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
  if (!url) throw new Error("Convex URL is not configured");
  client ??= new ConvexHttpClient(url);
  return client;
}

function secret() {
  const value = process.env.ELAN_CONVEX_API_SECRET;
  if (!value) throw new Error("ELAN_CONVEX_API_SECRET is not configured");
  return value;
}

export async function convexQuery<T>(name: string, args: Record<string, unknown>) {
  const reference = makeFunctionReference<"query", Record<string, unknown>, T>(name);
  return getClient().query(reference, { secret: secret(), ...args });
}

export async function convexMutation<T>(name: string, args: Record<string, unknown>) {
  const reference = makeFunctionReference<"mutation", Record<string, unknown>, T>(name);
  return getClient().mutation(reference, { secret: secret(), ...args });
}

export function torontoDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
