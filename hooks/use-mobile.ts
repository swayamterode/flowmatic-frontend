import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

/**
 * Tracks the mobile breakpoint through useSyncExternalStore rather than an
 * effect. A media query is external state, which is exactly what this hook is
 * for — and reading it here avoids the setState-in-effect cascade the previous
 * implementation caused on every mount.
 *
 * The server snapshot is `false` because matchMedia does not exist during SSR.
 * That matches the old behaviour, which returned `!!undefined` on its first
 * render; React swaps in the real value on hydration.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false,
  );
}
