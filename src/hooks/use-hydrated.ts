"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False on the server and during hydration, true once React has taken over. */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
