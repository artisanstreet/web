import { QueryClient } from "@tanstack/react-query";
import { CoreApi, type ApiOptions } from "./api.ts";

export const create_core_api = (base = "", opts: ApiOptions = {}): CoreApi => new CoreApi(base, opts);

export type { ApiOptions };

const query_defaults = {
  queries: {
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  },
  mutations: {
    retry: 0,
  },
} as const;

export const create_query_client = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { ...query_defaults.queries },
      mutations: { ...query_defaults.mutations },
    },
  });

export interface QueryOptions<T> {
  readonly queryKey: readonly unknown[];
  readonly queryFn: () => Promise<T>;
}

const options_for = <T>(key: readonly unknown[], fn: () => Promise<T>): QueryOptions<T> => ({
  queryKey: key,
  queryFn: fn,
});

export const me_query_options = (api: CoreApi): QueryOptions<Awaited<ReturnType<CoreApi["me"]>>> =>
  options_for(["core", "me"], () => api.me());

export const sessions_query_options = (api: CoreApi): QueryOptions<Awaited<ReturnType<CoreApi["sessions"]>>> =>
  options_for(["core", "sessions"], () => api.sessions());

export const machines_query_options = (api: CoreApi): QueryOptions<Awaited<ReturnType<CoreApi["machines"]>>> =>
  options_for(["core", "machines"], () => api.machines());

export const provider_connections_query_options = (
  api: CoreApi,
): QueryOptions<Awaited<ReturnType<CoreApi["provider_connections"]>>> =>
  options_for(["core", "vault", "connections"], () => api.provider_connections());

export const artifacts_query_options = (api: CoreApi): QueryOptions<Awaited<ReturnType<CoreApi["artifacts"]>>> =>
  options_for(["core", "artifacts"], () => api.artifacts());

export const latest_bundle_query_options = (
  api: CoreApi,
): QueryOptions<Awaited<ReturnType<CoreApi["latest_bundle"]>>> =>
  options_for(["core", "config", "latest"], () => api.latest_bundle());

export const activity_query_options = (
  api: CoreApi,
  limit = 50,
): QueryOptions<Awaited<ReturnType<CoreApi["activity"]>>> =>
  options_for(["core", "activity", limit], () => api.activity(limit));

export const deletion_status_query_options = (
  api: CoreApi,
): QueryOptions<Awaited<ReturnType<CoreApi["deletion_status"]>>> =>
  options_for(["core", "deletion"], () => api.deletion_status());

export const version_query_options = (api: CoreApi): QueryOptions<Awaited<ReturnType<CoreApi["version"]>>> =>
  options_for(["core", "version"], () => api.version());
