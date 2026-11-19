import { cn } from "@/lib/cn";
import { formatPrice, splitPrice } from "@/lib/money";

interface PriceProps {
  priceCents: number;
  size?: "md" | "lg";
  className?: string;
}

export function Price({ priceCents, size = "md", className }: PriceProps) {
  const { dollars, cents } = splitPrice(priceCents);
  const small = size === "lg" ? "text-base" : "text-xs";
  return (
    <p className={cn("flex items-baseline font-bold leading-none", className)}>
      <span className="sr-only">Price {formatPrice(priceCents)}</span>
      <span aria-hidden="true" className={cn("self-start pt-1", small)}>
        $
      </span>
      <span aria-hidden="true" className={size === "lg" ? "text-5xl" : "text-2xl"}>
        {dollars}
      </span>
      <span aria-hidden="true" className={cn("self-start pt-1", small)}>
        .{cents}
      </span>
    </p>
  );
}

interface RatingProps {
  value: number | null;
  count: number;
}

export function Rating({ value, count }: RatingProps) {
  if (value === null) return null;
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <p className="flex items-center gap-1.5 text-xs text-ink-soft">
      <span className="sr-only">
        Rated {value.toFixed(1)} out of 5 from {count} reviews
      </span>
      <span aria-hidden="true" className="relative inline-block text-sm leading-none tracking-tight text-line">
        ★★★★★
        <span className="absolute inset-y-0 left-0 overflow-hidden whitespace-nowrap text-ink" style={{ width: `${percent}%` }}>
          ★★★★★
        </span>
      </span>
      <span aria-hidden="true">({count})</span>
    </p>
  );
}
