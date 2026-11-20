import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/noto-sans/400.css";
import "@fontsource/noto-sans/700.css";
import "./globals.css";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/layout/toaster";
import { AppLink } from "@/components/ui/app-link";
import { buildOrganizationJsonLd, buildWebsiteJsonLd, jsonLdScript, siteBaseUrl } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteBaseUrl()),
  title: { default: "Nordhem Furnishing Store | Furniture & Home Furnishing", template: "%s | Nordhem Furnishing Store" },
  description:
    "Discover affordable furniture and home furnishing for all homes. Find quality storage solutions, mattresses, sofas and more. Be inspired and shop now!",
  openGraph: {
    type: "website",
    siteName: "Nordhem Furnishing Store",
    title: "Nordhem Furnishing Store",
    description: "Affordable furniture and home furnishing — storage, sofas, mattresses and more.",
  },
  twitter: { card: "summary" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const base = siteBaseUrl();
  return (
    <html lang="en-SG">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(buildOrganizationJsonLd(base)) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(buildWebsiteJsonLd(base)) }}
        />
        <div className="bg-surface text-center text-xs">
          <AppLink href="/customer-service/returns-claims/return-policy/" className="block px-4 py-2 font-bold hover:underline">
            365 days to change your mind
          </AppLink>
        </div>
        <Header />
        <main id="content">{children}</main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
