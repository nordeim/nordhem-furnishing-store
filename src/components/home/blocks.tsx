import type { ReactNode } from "react";
import { AppLink } from "@/components/ui/app-link";
import { SmartImage } from "@/components/ui/smart-image";
import { cn } from "@/lib/cn";

export function Section({ title, text, children, className }: { title?: string; text?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("page-x mx-auto mt-12 max-w-page md:mt-16", className)}>
      {title && <h2 className="text-2xl font-bold leading-tight md:text-3xl">{title}</h2>}
      {text && <p className="mt-3 max-w-3xl text-sm text-ink-soft md:text-base">{text}</p>}
      <div className={title || text ? "mt-6" : undefined}>{children}</div>
    </section>
  );
}

interface MediaCardProps {
  href: string;
  img: string;
  alt: string;
  title?: string;
  text?: string;
  aspect?: string;
}

export function MediaCard({ href, img, alt, title, text, aspect = "aspect-[4/5]" }: MediaCardProps) {
  return (
    <AppLink href={href} className="group block h-full">
      <SmartImage src={img} alt={alt} size="m" className={cn("w-full object-cover", aspect)} />
      {title && <span className="mt-3 block text-base font-bold leading-snug group-hover:underline">{title}</span>}
      {text && <span className="mt-1 line-clamp-4 block text-sm text-ink-soft">{text}</span>}
    </AppLink>
  );
}
