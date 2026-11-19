import type { Metadata } from "next";
import { FamilyForm } from "@/components/forms/family-form";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = { title: "IKEA Family" };

export default function IkeaFamilyPage() {
  return (
    <div className="page-x mx-auto max-w-page py-6">
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "IKEA Family" }]} />
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">Hej! Join IKEA Family</h1>
          <p className="mt-4 max-w-lg text-ink-soft">
            Some clubs are for the select few, but IKEA Family is for everyone. Become a Family member and enjoy rewards, discounts, inspirations and a few surprises all year round.
          </p>
        </div>
        <FamilyForm />
      </div>
    </div>
  );
}
