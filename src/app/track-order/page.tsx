import type { Metadata } from "next";
import { TrackForm } from "@/components/forms/track-form";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = { title: "Track your order" };

export default function TrackOrderPage() {
  return (
    <div className="page-x mx-auto max-w-page py-6">
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Track order" }]} />
      <h1 className="mb-2 mt-4 text-3xl font-bold">Track your order</h1>
      <p className="mb-8 max-w-xl text-sm text-ink-soft">Enter the order number from your confirmation and the email you used at checkout.</p>
      <TrackForm />
    </div>
  );
}
