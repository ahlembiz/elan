import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const title = "Élan — Votre réadaptation, à votre rythme";
  const description = "Un compagnon bilingue de réadaptation à domicile pour pratiquer la communication et le mouvement en toute confiance.";

  return {
    metadataBase: new URL(`${protocol}://${host}`),
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "fr_CA",
      images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Élan — Votre réadaptation, à votre rythme" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr-CA">
      <body>{children}</body>
    </html>
  );
}
