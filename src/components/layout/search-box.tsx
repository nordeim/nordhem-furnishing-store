"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { AppLink } from "@/components/ui/app-link";
import { SmartImage } from "@/components/ui/smart-image";
import { formatPrice } from "@/lib/money";

interface SuggestionProduct {
  id: number;
  slug: string;
  name: string;
  typeDesc: string;
  priceCents: number;
  image: string;
}

interface SuggestionPayload {
  products: SuggestionProduct[];
  categories: { slug: string; name: string }[];
}

const DEBOUNCE_MS = 200;

export function SearchBox() {
  const router = useRouter();
  const listId = useId();
  const root = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SuggestionPayload | null>(null);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (!response.ok) return;
        setResults((await response.json()) as SuggestionPayload);
      } catch {
        // Aborted or offline: suggestions are best-effort, full search still works on submit.
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  const hasResults = results !== null && (results.products.length > 0 || results.categories.length > 0);
  const showPanel = open && query.trim().length >= 2 && results !== null;

  return (
    <form ref={root} role="search" onSubmit={handleSubmit} className="relative w-full">
      <label htmlFor="site-search" className="sr-only">
        Search products
      </label>
      <div className="flex h-12 items-center rounded-full bg-surface px-4 focus-within:outline-2 focus-within:outline-ink hover:bg-line/60">
        <button type="submit" aria-label="Search" className="grid size-10 place-items-center rounded-full">
          <Icon name="search" />
        </button>
        <input
          id="site-search"
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          maxLength={80}
          value={query}
          placeholder="What are you looking for?"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            setOpen(true);
            if (value.trim().length < 2) setResults(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-ink-soft"
        />
      </div>

      {showPanel && (
        <div id={listId} className="absolute left-0 right-0 top-14 z-50 max-h-[70vh] overflow-y-auto rounded-lg border border-line bg-white p-2 shadow-xl">
          {!hasResults && <p className="p-4 text-sm text-ink-soft">No suggestions for “{query.trim()}”. Press enter to search everything.</p>}
          {results.categories.length > 0 && (
            <ul aria-label="Categories" className="mb-1 border-b border-line pb-1">
              {results.categories.map((category) => (
                <li key={category.slug}>
                  <AppLink href={`/cat/${category.slug}`} onClick={() => setOpen(false)} className="block rounded px-3 py-2 text-sm font-bold hover:bg-surface">
                    {category.name}
                  </AppLink>
                </li>
              ))}
            </ul>
          )}
          {results.products.length > 0 && (
            <ul aria-label="Products">
              {results.products.map((product) => (
                <li key={product.id}>
                  <AppLink href={`/p/${product.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded px-3 py-2 hover:bg-surface">
                    <SmartImage src={product.image} alt="" size="s" className="size-12 shrink-0 object-contain mix-blend-multiply" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{product.name}</span>
                      <span className="block truncate text-xs text-ink-soft">{product.typeDesc}</span>
                    </span>
                    <span className="text-sm font-bold">{formatPrice(product.priceCents)}</span>
                  </AppLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
