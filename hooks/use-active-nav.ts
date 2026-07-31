"use client";

import { usePathname } from "next/navigation";
import { navLinks, type SidebarNavItem } from "@/components/app-shared";

/**
 * Nav entries that point at real routes, longest path first so `/a/b` wins
 * over `/a`. Hash placeholders (`#/templates`) are skipped — they have no page.
 */
const routableLinks = navLinks
  .filter((item): item is SidebarNavItem & { path: string } => Boolean(item.path?.startsWith("/")))
  .sort((a, b) => b.path.length - a.path.length);

/** The nav item matching the current URL — the only source of active state. */
export function useActiveNavItem(): SidebarNavItem | undefined {
  const pathname = usePathname();

  return routableLinks.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  );
}

export function useActiveNavPath(): string | undefined {
  return useActiveNavItem()?.path;
}
