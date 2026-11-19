import { randomInt } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureCatalog } from "@/db/seed";
import { cartItems, familyMembers, favourites, orderItems, orders, products } from "@/db/schema";
import { computeTotals, MAX_LINE_QUANTITY, type CartTotals, type DeliveryMethod } from "@/lib/cart-math";
import type { Product } from "@/lib/catalog";

export interface CartLine {
  productId: number;
  slug: string;
  name: string;
  typeDesc: string;
  image: string;
  unitPriceCents: number;
  quantity: number;
}

export interface CartSnapshot {
  lines: CartLine[];
  totals: CartTotals;
}

export interface ShoppingSummary {
  cartCount: number;
  favouriteIds: number[];
}

const lineColumns = {
  productId: products.id,
  slug: products.slug,
  name: products.name,
  typeDesc: products.typeDesc,
  image: products.image,
  unitPriceCents: products.priceCents,
  quantity: cartItems.quantity,
};

export async function getCartLines(sessionId: string): Promise<CartLine[]> {
  return db
    .select(lineColumns)
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .where(eq(cartItems.sessionId, sessionId))
    .orderBy(asc(cartItems.id));
}

export async function getCartSnapshot(
  sessionId: string | undefined,
  method: DeliveryMethod = "delivery",
): Promise<CartSnapshot> {
  const lines = sessionId ? await getCartLines(sessionId) : [];
  return { lines, totals: computeTotals(lines, method) };
}

async function productExists(productId: number): Promise<boolean> {
  await ensureCatalog();
  const [row] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
  return row !== undefined;
}

export async function addToCart(sessionId: string, productId: number, quantity: number): Promise<boolean> {
  if (!(await productExists(productId))) return false;
  await db
    .insert(cartItems)
    .values({ sessionId, productId, quantity })
    .onConflictDoUpdate({
      target: [cartItems.sessionId, cartItems.productId],
      set: {
        quantity: sql`least(${MAX_LINE_QUANTITY}, ${cartItems.quantity} + excluded.quantity)`,
        updatedAt: sql`now()`,
      },
    });
  return true;
}

export async function setCartQuantity(sessionId: string, productId: number, quantity: number): Promise<boolean> {
  const updated = await db
    .update(cartItems)
    .set({ quantity, updatedAt: sql`now()` })
    .where(and(eq(cartItems.sessionId, sessionId), eq(cartItems.productId, productId)))
    .returning({ id: cartItems.id });
  return updated.length > 0;
}

export async function removeFromCart(sessionId: string, productId: number): Promise<void> {
  await db.delete(cartItems).where(and(eq(cartItems.sessionId, sessionId), eq(cartItems.productId, productId)));
}

export async function addFavourite(sessionId: string, productId: number): Promise<boolean> {
  if (!(await productExists(productId))) return false;
  await db.insert(favourites).values({ sessionId, productId }).onConflictDoNothing();
  return true;
}

export async function removeFavourite(sessionId: string, productId: number): Promise<void> {
  await db.delete(favourites).where(and(eq(favourites.sessionId, sessionId), eq(favourites.productId, productId)));
}

export async function getFavouriteProducts(sessionId: string | undefined): Promise<Product[]> {
  if (!sessionId) return [];
  const rows = await db
    .select({ product: products })
    .from(favourites)
    .innerJoin(products, eq(products.id, favourites.productId))
    .where(eq(favourites.sessionId, sessionId))
    .orderBy(desc(favourites.id));
  return rows.map((row) => row.product);
}

export async function getSummary(sessionId: string | undefined): Promise<ShoppingSummary> {
  if (!sessionId) return { cartCount: 0, favouriteIds: [] };
  const [[cart], favouriteRows] = await Promise.all([
    db
      .select({ count: sql<number>`coalesce(sum(${cartItems.quantity}), 0)::int` })
      .from(cartItems)
      .where(eq(cartItems.sessionId, sessionId)),
    db.select({ productId: favourites.productId }).from(favourites).where(eq(favourites.sessionId, sessionId)),
  ]);
  return { cartCount: cart.count, favouriteIds: favouriteRows.map((row) => row.productId) };
}

export interface OrderInput {
  name: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  method: DeliveryMethod;
}

export type PlaceOrderResult = { ok: true; orderNo: string } | { ok: false; reason: "empty_cart" };

const UNIQUE_VIOLATION = "23505";
const ORDER_NO_ATTEMPTS = 5;

export function generateOrderNo(): string {
  return `IKSG-${String(randomInt(0, 10_000_000_000)).padStart(10, "0")}`;
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const direct = (error as { code?: unknown }).code;
  const nested = (error as { cause?: { code?: unknown } }).cause?.code;
  return direct === UNIQUE_VIOLATION || nested === UNIQUE_VIOLATION;
}

/** Prices are re-read from the database inside the transaction; client-supplied prices never exist. */
export async function placeOrder(sessionId: string, input: OrderInput): Promise<PlaceOrderResult> {
  for (let attempt = 0; attempt < ORDER_NO_ATTEMPTS; attempt += 1) {
    const orderNo = generateOrderNo();
    try {
      return await db.transaction(async (tx) => {
        const lines = await tx
          .select(lineColumns)
          .from(cartItems)
          .innerJoin(products, eq(products.id, cartItems.productId))
          .where(eq(cartItems.sessionId, sessionId));
        if (lines.length === 0) return { ok: false as const, reason: "empty_cart" as const };

        const totals = computeTotals(lines, input.method);
        const [order] = await tx
          .insert(orders)
          .values({
            orderNo,
            sessionId,
            customerName: input.name,
            email: input.email,
            phone: input.phone,
            address: input.address,
            postalCode: input.postalCode,
            deliveryMethod: input.method,
            subtotalCents: totals.subtotalCents,
            deliveryCents: totals.deliveryCents,
            totalCents: totals.totalCents,
          })
          .returning({ id: orders.id });

        await tx.insert(orderItems).values(
          lines.map((line) => ({
            orderId: order.id,
            productId: line.productId,
            name: line.name,
            typeDesc: line.typeDesc,
            image: line.image,
            unitPriceCents: line.unitPriceCents,
            quantity: line.quantity,
          })),
        );
        await tx.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
        return { ok: true as const, orderNo };
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new Error("Could not allocate a unique order number");
}

export async function getOrderForSession(orderNo: string, sessionId: string | undefined) {
  if (!sessionId) return undefined;
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderNo, orderNo), eq(orders.sessionId, sessionId)))
    .limit(1);
  if (!order) return undefined;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(asc(orderItems.id));
  return { order, items };
}

/** Deliberately minimal: order number + matching email is the only proof of ownership offered. */
export async function trackOrder(orderNo: string, email: string) {
  const [order] = await db
    .select({
      orderNo: orders.orderNo,
      status: orders.status,
      createdAt: orders.createdAt,
      totalCents: orders.totalCents,
      deliveryMethod: orders.deliveryMethod,
    })
    .from(orders)
    .where(and(eq(orders.orderNo, orderNo), eq(orders.email, email)))
    .limit(1);
  return order;
}

export async function joinFamily(input: { name: string; email: string; marketingConsent: boolean }): Promise<void> {
  await db
    .insert(familyMembers)
    .values(input)
    .onConflictDoUpdate({
      target: familyMembers.email,
      set: { name: input.name, marketingConsent: input.marketingConsent },
    });
}
