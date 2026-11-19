import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppLink } from "@/components/ui/app-link";
import { SmartImage } from "@/components/ui/smart-image";
import { formatPrice } from "@/lib/money";
import { getSessionId } from "@/lib/session";
import { getOrderForSession } from "@/lib/shopping";
import { ORDER_NO_PATTERN } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order confirmation", robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await params;
  if (!ORDER_NO_PATTERN.test(orderNo)) notFound();

  // Ownership is the placing session; anyone else must use /track-order with the email.
  const found = await getOrderForSession(orderNo, await getSessionId());
  if (!found) notFound();
  const { order, items } = found;

  return (
    <div className="page-x mx-auto max-w-3xl py-10">
      <h1 className="text-3xl font-bold">Thank you, {order.customerName.split(" ")[0]}!</h1>
      <p className="mt-2 text-ink-soft">
        Your order <strong className="text-ink">{order.orderNo}</strong> has been received. We’ve noted {order.email} for updates.
      </p>
      <ul className="mt-8 divide-y divide-line border-y border-line">
        {items.map((item) => (
          <li key={item.id} className="flex gap-4 py-4 text-sm">
            <SmartImage src={item.image} alt="" size="s" className="size-16 object-contain mix-blend-multiply" />
            <div className="flex-1">
              <p className="font-bold">{item.name}</p>
              <p className="text-ink-soft">{item.typeDesc}</p>
              <p className="text-ink-soft">Qty {item.quantity}</p>
            </div>
            <p className="font-bold">{formatPrice(item.unitPriceCents * item.quantity)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatPrice(order.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{order.deliveryMethod === "delivery" ? "Home delivery" : "Click & collect"}</dt>
          <dd>{order.deliveryCents === 0 ? "Free" : formatPrice(order.deliveryCents)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
          <dt>Total</dt>
          <dd>{formatPrice(order.totalCents)}</dd>
        </div>
      </dl>
      <AppLink href="/" className="btn btn-dark mt-8">
        Continue shopping
      </AppLink>
    </div>
  );
}
