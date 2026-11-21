"use client";

import { useEffect, useRef, useState } from "react";
import { AppLink } from "@/components/ui/app-link";
import { Carousel } from "@/components/ui/carousel";
import { SmartImage } from "@/components/ui/smart-image";
import { formatPrice } from "@/lib/money";

export interface HotspotProduct {
  x: number;
  y: number;
  name: string;
  typeDesc: string;
  priceCents: number;
  href: string;
}

export interface HeroSlide {
  img: string;
  alt: string;
  hotspots: HotspotProduct[];
}

export function ShoppableHero({ slides }: { slides: HeroSlide[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // The popover is NON-modal (it never traps focus or blocks the page) — so it closes on
  // outside pointerdown and Escape, like a disclosure, instead of pretending to be a dialog.
  // The open hotspot's container carries [data-hotspot-open]: presses inside it (the button
  // OR its inner dot) belong to the toggle, not to "outside" — a shared buttonRef cannot
  // express this (it would hold only the last-rendered hotspot's button).
  useEffect(() => {
    if (!openKey) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target instanceof Element ? event.target : null;
      const insideOpenHotspot = target?.closest("[data-hotspot-open]") ?? null;
      if (!insideOpenHotspot && popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpenKey(null);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenKey(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openKey]);

  return (
    <Carousel
      label="Christmas inspiration"
      itemClassName="w-[88%] md:w-[46%] xl:w-[32%]"
      items={slides.map((slide, slideIndex) => (
        <div key={slide.img} className="relative aspect-[4/5] overflow-hidden bg-surface">
          <SmartImage src={slide.img} alt={slide.alt} size="l" className="size-full object-cover" />
          {slide.hotspots.map((spot, spotIndex) => {
            const key = `${slideIndex}-${spotIndex}`;
            const isOpen = openKey === key;
            return (
              <div key={key} className="absolute" style={{ left: `${spot.x}%`, top: `${spot.y}%` }} {...(isOpen ? { "data-hotspot-open": "" } : {})}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-label={`Product information: ${spot.name}`}
                  onClick={() => setOpenKey(isOpen ? null : key)}
                  /* Session-009 S9-L5: 44px hit area (WCAG 2.5.8 floor) — the button is a
                     transparent size-11 grid; the visible 32px white dot is the inner span. */
                  className="grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-white/90 shadow-md hover:scale-110">
                    <span className="size-3 rounded-full bg-ink" />
                  </span>
                </button>
                {isOpen && (
                  <div
                    ref={popoverRef}
                    role="group"
                    aria-labelledby="hotspot-popover-name"
                    data-testid="hotspot-popover"
                    className="absolute z-20 mt-3 w-52 -translate-x-1/2 rounded-lg bg-white p-3 text-left shadow-xl"
                    style={{ left: spot.x > 70 ? "-30%" : spot.x < 30 ? "30%" : "0" }}
                  >
                    <p id="hotspot-popover-name" className="text-sm font-bold">
                      {spot.name}
                    </p>
                    <p className="line-clamp-2 text-xs text-ink-soft">{spot.typeDesc}</p>
                    <p className="mt-1 text-sm font-bold">{formatPrice(spot.priceCents)}</p>
                    <AppLink href={spot.href} className="mt-2 inline-block text-xs font-bold underline">
                      View product
                    </AppLink>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    />
  );
}
