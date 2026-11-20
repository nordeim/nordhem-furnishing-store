"use client";

import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { SearchBox } from "@/components/layout/search-box";
import { AppLink } from "@/components/ui/app-link";
import { SmartImage } from "@/components/ui/smart-image";
import { primaryNav, productCategories } from "@/content/nav";
import { cn } from "@/lib/cn";
import { ensureSummaryLoaded, useShopping } from "@/lib/client/shopping-store";

type Panel = "products" | "mobile" | null;

const NAV_ITEM = "rounded-full px-3 py-2 text-sm font-bold hover:bg-surface";

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span aria-hidden="true" className="absolute right-0.5 top-0.5 grid min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold leading-5 text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function IconLink({ href, label, icon, count = 0 }: { href: string; label: string; icon: IconName; count?: number }) {
  return (
    <AppLink href={href} aria-label={count > 0 ? `${label}, ${count} items` : label} title={label} className="relative grid size-12 place-items-center rounded-full hover:bg-surface">
      <Icon name={icon} />
      <CountBadge count={count} />
    </AppLink>
  );
}

export function Header() {
  const [panel, setPanel] = useState<Panel>(null);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const { cartCount, favouriteIds } = useShopping();

  useEffect(() => ensureSummaryLoaded(), []);

  useEffect(() => {
    if (!panel) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPanel(null);
    }
    function onPointerDown(event: PointerEvent) {
      if (panel === "products" && headerRef.current && !headerRef.current.contains(event.target as Node)) setPanel(null);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [panel]);

  useEffect(() => {
    if (panel !== "mobile") return;
    // Capture the button now: menuButtonRef.current at cleanup time may be stale
    // (react-hooks/exhaustive-deps) — session-005 L-5.
    const menuButton = menuButtonRef.current;
    const drawer = document.getElementById("mobile-drawer");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    // aria-modal="true" promises the background is inert — enforce it: wrap Tab inside the
    // drawer, and restore focus to the hamburger when it closes.
    function onTab(event: KeyboardEvent) {
      if (event.key !== "Tab" || !drawer) return;
      const focusables = Array.from(
        drawer.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"),
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (active === first || !drawer.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !drawer.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onTab, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onTab, true);
      menuButton?.focus();
    };
  }, [panel]);

  const close = () => setPanel(null);

  return (
    <header ref={headerRef} className="sticky top-0 z-40 border-b border-line bg-white">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-white focus:p-3 focus:font-bold">
        Skip to main content
      </a>
      <div className="page-x mx-auto flex max-w-page flex-wrap items-center gap-x-2 gap-y-2 py-3 lg:flex-nowrap lg:gap-x-3 lg:py-4">
        <AppLink href="/" aria-label="IKEA logotype, go to start page" className="mr-2 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/ikea-logo.svg" alt="IKEA" width={98} height={40} className="h-8 w-auto lg:h-10" />
        </AppLink>

        <nav aria-label="Menu" className="hidden items-center lg:flex">
          <button
            type="button"
            aria-expanded={panel === "products"}
            aria-controls="products-panel"
            onClick={() => setPanel((current) => (current === "products" ? null : "products"))}
            className={cn(NAV_ITEM, "flex items-center gap-1", panel === "products" && "bg-surface")}
          >
            Products
            <Icon name="chevronDown" className={cn("size-4 transition-transform", panel === "products" && "rotate-180")} />
          </button>
          {primaryNav.map((item) => (
            <AppLink key={item.href} href={item.href} className={NAV_ITEM} onClick={close}>
              {item.label}
            </AppLink>
          ))}
        </nav>

        <div className="order-last basis-full lg:order-none lg:basis-auto lg:flex-1">
          <SearchBox />
        </div>

        <nav aria-label="Shopping links" className="ml-auto flex items-center lg:ml-0">
          <AppLink href="/ikea-family" className="mr-1 hidden rounded-full px-3 py-2 text-sm font-bold hover:bg-surface xl:block">
            Hej! Log in or sign up
          </AppLink>
          <span className="xl:hidden">
            <IconLink href="/ikea-family" label="Hej! Log in or sign up" icon="user" />
          </span>
          <IconLink href="/track-order" label="Track order" icon="truck" />
          <IconLink href="/favourites" label="Shopping list" icon="heart" count={favouriteIds.length} />
          <IconLink href="/cart" label="Shopping cart" icon="cart" count={cartCount} />
          <button ref={menuButtonRef} type="button" aria-label="Menu" aria-expanded={panel === "mobile"} aria-controls="mobile-drawer" onClick={() => setPanel("mobile")} className="grid size-12 place-items-center rounded-full hover:bg-surface lg:hidden">
            <Icon name="menu" />
          </button>
        </nav>
      </div>

      {panel === "products" && (
        <div id="products-panel" className="absolute inset-x-0 top-full hidden border-t border-line bg-white shadow-xl lg:block">
          <div className="page-x mx-auto max-w-page py-8">
            <h2 className="mb-6 text-xl font-bold">All products</h2>
            <ul className="grid grid-cols-4 gap-x-6 gap-y-4 xl:grid-cols-5">
              {productCategories.map((category) => (
                <li key={category.href}>
                  <AppLink href={category.href} onClick={close} className="flex items-center gap-3 rounded-lg p-2 text-sm font-bold hover:bg-surface">
                    {category.img && <SmartImage src={category.img} alt="" size="s" className="size-14 shrink-0 rounded-full object-cover" />}
                    <span>{category.label}</span>
                  </AppLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {panel === "mobile" && (
        <div id="mobile-drawer" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <span className="text-lg font-bold">Menu</span>
            <button ref={closeRef} type="button" aria-label="Close menu" onClick={close} className="grid size-12 place-items-center rounded-full hover:bg-surface">
              <Icon name="close" />
            </button>
          </div>
          <nav aria-label="Mobile menu" className="flex-1 overflow-y-auto px-5 py-4">
            <button
              type="button"
              aria-expanded={mobileProductsOpen}
              onClick={() => setMobileProductsOpen((open) => !open)}
              className="flex w-full items-center justify-between py-3 text-left text-lg font-bold"
            >
              Products
              <Icon name="chevronDown" className={cn("size-5 transition-transform", mobileProductsOpen && "rotate-180")} />
            </button>
            {mobileProductsOpen && (
              <ul className="mb-2 border-l-2 border-line pl-4">
                {productCategories.map((category) => (
                  <li key={category.href}>
                    <AppLink href={category.href} onClick={close} className="block py-2.5 text-sm">
                      {category.label}
                    </AppLink>
                  </li>
                ))}
              </ul>
            )}
            <ul>
              {primaryNav.map((item) => (
                <li key={item.href}>
                  <AppLink href={item.href} onClick={close} className="block py-3 text-lg font-bold">
                    {item.label}
                  </AppLink>
                </li>
              ))}
            </ul>
            <ul className="mt-4 border-t border-line pt-4 text-sm">
              {[
                { label: "Hej! Log in or sign up", href: "/ikea-family" },
                { label: "Track order", href: "/track-order" },
                { label: "Shopping list", href: "/favourites" },
                { label: "Shopping cart", href: "/cart" },
                { label: "Find a store", href: "/stores" },
              ].map((item) => (
                <li key={item.href}>
                  <AppLink href={item.href} onClick={close} className="block py-2.5">
                    {item.label}
                  </AppLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
