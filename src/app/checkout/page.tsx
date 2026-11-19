import type { Metadata } from "next";
import { CheckoutForm } from "@/components/forms/checkout-form";
import { AppLink } from "@/components/ui/app-link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getSessionId } from "@/lib/session";
import { getCartLines } from "@/lib/shopping";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const sessionId = await getSessionId();
  const lines = sessionId ? await getCartLines(sessionId) : [];

  return (
    <div className="page-x mx-auto max-w-page py-6">
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Shopping cart", href: "/cart" }, { label: "Checkout" }]} />
      <h1 className="mb-6 mt-4 text-3xl font-bold">Checkout</h1>
      {lines.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg font-bold">Your shopping cart is empty</p>
          <AppLink href="/" className="btn btn-dark mt-6">
            Continue shopping
          </AppLink>
        </div>
      ) : (
        <CheckoutForm lines={lines} />
      )}
    </div>
  );
}
