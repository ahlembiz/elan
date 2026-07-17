import type { Metadata } from "next";
import { headers } from "next/headers";
import { Atkinson_Hyperlegible, Fraunces } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["opsz", "SOFT"],
});

const body = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-body",
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const title = "Élan — Votre réadaptation, simplement";
  const description = "Un compagnon bilingue, lisible et accessible pour vos séances, votre communication et votre plan de réadaptation à domicile.";

  return {
    metadataBase: new URL(`${protocol}://${host}`),
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "fr_CA",
      images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Élan — Votre réadaptation, simplement" }],
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
    <html lang="fr-CA" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
