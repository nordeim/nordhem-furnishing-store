import type { Metadata } from "next";
import { AppLink } from "@/components/ui/app-link";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="page-x mx-auto max-w-2xl py-24 text-center">
      <p className="text-sm font-bold text-ink-soft">404</p>
      <h1 className="mt-2 text-3xl font-bold">We couldn’t find that page</h1>
      <p className="mt-3 text-ink-soft">The link may be outdated, or the product may no longer be available.</p>
      <AppLink href="/" className="btn btn-dark mt-8">
        Back to start page
      </AppLink>
    </div>
  );
}
