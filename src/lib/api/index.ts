import { env } from "@/lib/env";
import { createApi, type PayViaApi } from "./client";
import { createLiveApi } from "./live/client";
import { GATEWAY_PATH } from "./live/paths";
import { recoverSession } from "./live/session";

export const MOCK_API_PATH = "/api/mock";

/** Browser-side API client. Server Components use `serverApi()` instead. */
export const api: PayViaApi =
  env.apiMode === "mock"
    ? createApi({ baseUrl: MOCK_API_PATH })
    : createLiveApi({
        baseUrl: GATEWAY_PATH,
        appUrl: env.appUrl,
        network: env.stellarNetwork,
        recover: recoverSession,
      });

export { ApiError } from "./errors";
export type * from "./schemas";
