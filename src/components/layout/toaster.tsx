"use client";

import { Icon } from "@/components/icons";
import { dismissNotice, useShopping } from "@/lib/client/shopping-store";
import { cn } from "@/lib/cn";

export function Toaster() {
  const { notice } = useShopping();
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      {notice && (
        <div
          key={notice.id}
          className={cn(
            "pointer-events-auto flex max-w-md items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold text-white shadow-lg",
            notice.tone === "success" ? "bg-ink" : "bg-negative",
          )}
        >
          <span>{notice.text}</span>
          <button type="button" aria-label="Dismiss notification" onClick={dismissNotice} className="grid size-8 place-items-center rounded-full hover:bg-white/20">
            <Icon name="close" className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
