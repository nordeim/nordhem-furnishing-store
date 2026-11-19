import type { Metadata } from "next";
import { CartView } from "@/components/shop/cart-view";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getSessionId } from "@/lib/session";
import { getCartSnapshot } from "@/lib/shopping";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shopping cart", robots: { index: false } };

export default async function CartPage() {
  const snapshot = await getCartSnapshot(await getSessionId());
  return (
    <div className="page-x mx-auto max-w-page py-6">
      <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Shopping cart" }]} />
      <h1 className="mb-6 mt-4 text-3xl font-bold">Shopping cart</h1>
      <CartView initial={snapshot} />
    </div>
  );
}
