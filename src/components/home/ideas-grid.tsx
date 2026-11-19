"use client";

import { useState } from "react";
import { AppLink } from "@/components/ui/app-link";
import { SmartImage } from "@/components/ui/smart-image";

export interface IdeaCard {
  href: string;
  img: string;
  alt: string;
  title: string;
}

const STEP = 6;

export function IdeasGrid({ ideas }: { ideas: IdeaCard[] }) {
  const [visible, setVisible] = useState(STEP);
  const remaining = ideas.length - visible;

  return (
    <div>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {ideas.slice(0, visible).map((idea) => (
          <li key={`${idea.href}-${idea.img}`}>
            <AppLink href={idea.href} className="group block">
              <SmartImage src={idea.img} alt={idea.alt} size="m" className="aspect-[4/3] w-full object-cover" />
              <span className="mt-2 block text-sm font-bold group-hover:underline">{idea.title}</span>
            </AppLink>
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <div className="mt-6 text-center">
          <button type="button" onClick={() => setVisible((count) => count + STEP)} className="btn btn-light">
            Load {Math.min(STEP, remaining)} more
          </button>
        </div>
      )}
    </div>
  );
}
