"use client";

import { useSyncExternalStore } from "react";

export interface ShoppingState {
  cartCount: number;
  favouriteIds: readonly number[];
  notice: { id: number; text: string; tone: "success" | "error" } | null;
}

interface CartResponse {
  totals: { itemCount: number };
}

interface SummaryResponse {
  cartCount: number;
  favouriteIds: number[];
}

export type MutationResult = { ok: true } | { ok: false; message: string };

const SERVER_STATE: ShoppingState = { cartCount: 0, favouriteIds: [], notice: null };
const NOTICE_MS = 3500;

let state: ShoppingState = SERVER_STATE;
let noticeCounter = 0;
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
let summaryLoaded = false;
const listeners = new Set<() => void>();

function setState(next: Partial<ShoppingState>): void {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function notify(text: string, tone: "success" | "error"): void {
  noticeCounter += 1;
  setState({ notice: { id: noticeCounter, text, tone } });
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => setState({ notice: null }), NOTICE_MS);
}

export function dismissNotice(): void {
  clearTimeout(noticeTimer);
  setState({ notice: null });
}

/** Shared JSON fetch wrapper: never throws, always resolves to a typed success or message. */
export async function request<T>(url: string, method: string, body?: unknown): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        typeof payload === "object" && payload !== null && "error" in payload
          ? String((payload as { error: { message?: unknown } }).error.message ?? "Request failed.")
          : "Request failed.";
      return { ok: false, message };
    }
    return { ok: true, data: payload as T };
  } catch {
    return { ok: false, message: "Network error. Check your connection and try again." };
  }
}

export async function refreshSummary(): Promise<void> {
  const result = await request<SummaryResponse>("/api/summary", "GET");
  if (!result.ok) return;
  summaryLoaded = true;
  setState({ cartCount: result.data.cartCount, favouriteIds: result.data.favouriteIds });
}

export function ensureSummaryLoaded(): void {
  if (!summaryLoaded) {
    summaryLoaded = true;
    void refreshSummary();
  }
}

/** Lets the cart page push fresh totals without another round-trip. */
export function applyCartCount(cartCount: number): void {
  setState({ cartCount });
}

export async function addToCart(productId: number, name: string, quantity = 1): Promise<MutationResult> {
  const result = await request<CartResponse>("/api/cart", "POST", { productId, quantity });
  if (!result.ok) {
    notify(result.message, "error");
    return result;
  }
  setState({ cartCount: result.data.totals.itemCount });
  notify(`${name} added to your shopping cart`, "success");
  return { ok: true };
}

export async function toggleFavourite(productId: number, name: string): Promise<MutationResult> {
  const isFavourite = state.favouriteIds.includes(productId);
  const result = await request<SummaryResponse>("/api/favourites", isFavourite ? "DELETE" : "POST", { productId });
  if (!result.ok) {
    notify(result.message, "error");
    return result;
  }
  setState({ favouriteIds: result.data.favouriteIds, cartCount: result.data.cartCount });
  notify(isFavourite ? `${name} removed from your shopping list` : `${name} saved to your shopping list`, "success");
  return { ok: true };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useShopping(): ShoppingState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}
