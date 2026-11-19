"use client";

import { useState } from "react";
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
              <div key={key} className="absolute" style={{ left: `${spot.x}%`, top: `${spot.y}%` }}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-label={`Product information: ${spot.name}`}
                  onClick={() => setOpenKey(isOpen ? null : key)}
                  className="grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-md hover:scale-110"
                >
                  <span className="size-3 rounded-full bg-ink" />
                </button>
                {isOpen && (
                  <div
                    role="dialog"
                    aria-label={spot.name}
                    className="absolute z-20 mt-3 w-52 -translate-x-1/2 rounded-lg bg-white p-3 text-left shadow-xl"
                    style={{ left: spot.x > 70 ? "-30%" : spot.x < 30 ? "30%" : "0" }}
                  >
                    <p className="text-sm font-bold">{spot.name}</p>
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
