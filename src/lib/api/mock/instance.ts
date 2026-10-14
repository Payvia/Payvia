import "server-only";

import { env } from "@/lib/env";
import { MockStore } from "./store";

// State lives in memory: it resets when the server restarts and is not shared
// between server instances.
const globalStore = globalThis as typeof globalThis & {
  __payviaMockStore?: MockStore;
};

export function getMockStore() {
  globalStore.__payviaMockStore ??= new MockStore({ appUrl: env.appUrl });
  return globalStore.__payviaMockStore;
}
