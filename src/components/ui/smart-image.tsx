"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { imageUrl, type ImageSize } from "@/lib/images";

interface SmartImageProps {
  src: string;
  alt: string;
  size?: ImageSize;
  className?: string;
  priority?: boolean;
}

/** Plain <img> on purpose: assets are third-party hosted and pre-sized, so the Next optimiser adds nothing. */
export function SmartImage({ src, alt, size = "m", className, priority = false }: SmartImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div role="img" aria-label={alt} className={cn("bg-surface", className)} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl(src, size)}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("bg-surface", className)}
    />
  );
}
