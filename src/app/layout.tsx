import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/noto-sans/400.css";
import "@fontsource/noto-sans/700.css";
import "./globals.css";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/layout/toaster";
import { AppLink } from "@/components/ui/app-link";

export const metadata: Metadata = {
  title: { default: "Shop IKEA Singapore | Furniture & Home Furnishing", template: "%s | IKEA Singapore (clone)" },
  description:
    "Discover affordable furniture and home furnishing for all homes. Find quality storage solutions, mattresses, sofas and more. Be inspired and shop now!",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-SG">
      <body>
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
