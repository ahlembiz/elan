import { redirect } from "next/navigation";
import { getSession } from "../lib/session";
import ÉlanApp from "./ElanApp";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <ÉlanApp initialRole={session.role} currentName={session.name} />;
}
