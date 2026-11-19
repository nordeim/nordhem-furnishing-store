import Link from "next/link";
import type { ComponentProps } from "react";
import { isExternal, toHref } from "@/lib/links";

type AppLinkProps = Omit<ComponentProps<"a">, "href"> & { href: string };

export function AppLink({ href, children, ...rest }: AppLinkProps) {
  if (isExternal(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={toHref(href)} {...rest}>
      {children}
    </Link>
  );
}
