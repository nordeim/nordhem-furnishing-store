"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/cn";

interface CarouselProps {
  label: string;
  items: ReactNode[];
  itemClassName?: string;
  gapClassName?: string;
}

const ARROW =
  "absolute top-1/2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-[0_2px_8px_rgba(0,0,0,0.25)] hover:bg-surface md:grid";

export function Carousel({ label, items, itemClassName = "w-[72%] sm:w-[44%] lg:w-[24%]", gapClassName = "gap-4" }: CarouselProps) {
  const scroller = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    // ResizeObserver fires once on observe, which performs the initial measurement.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  function scrollByPage(direction: 1 | -1) {
    const el = scroller.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label} className="relative">
      {!edges.start && (
        <button type="button" aria-label="See previous items" onClick={() => scrollByPage(-1)} className={cn(ARROW, "left-2")}>
          <Icon name="chevronLeft" />
        </button>
      )}
      <ul
        ref={scroller}
        onScroll={measure}
        tabIndex={0}
        aria-label={`${label} items`}
        className={cn("scrollbar-none flex snap-x snap-mandatory overflow-x-auto scroll-smooth", gapClassName)}
      >
        {items.map((item, index) => (
          <li key={index} className={cn("shrink-0 snap-start", itemClassName)}>
            {item}
          </li>
        ))}
      </ul>
      {!edges.end && (
        <button type="button" aria-label="See next items" onClick={() => scrollByPage(1)} className={cn(ARROW, "right-2")}>
          <Icon name="chevronRight" />
        </button>
      )}
    </div>
  );
}
