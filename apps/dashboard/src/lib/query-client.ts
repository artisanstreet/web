import { QueryClient } from "@tanstack/react-query";
import { CoreApi, create_core_api, create_query_client as create_shared_client } from "@artisanstreet/core-client";
import { CORE_API_BASE } from "./env.ts";

// Single Query client for dashboard: SSR renders the public shell only,
// browser Query loads private account data direct against the configured
// API origin with credentials:include. Query cache is scoped to the current
// account; logout clears the cache (see auth-redirect.ts). No retries on
// mutations. Uses canonical shared client factory (no local duplication).
export const create_query_client = (): QueryClient => create_shared_client();

export const create_api_for_browser = (): CoreApi => create_core_api(CORE_API_BASE);

export const clear_account_cache = (client: QueryClient): void => {
  client.clear();
};
