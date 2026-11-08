import { VITE_CORE_API_URL } from "$app/env/public";
import { Effect, Layer, Match, Option } from "effect";
import { ClientRuntime } from "svelte-effect-runtime";
import { CoreApi } from "@artisanstreet/core-client";
import { active_account } from "./lib/account/active.ts";
import { HandoffChannel } from "./lib/auth/sign-in/handoff.ts";

const request_account = Effect.gen(function* () {
  const dashboard = yield* Effect.sync(() => globalThis.location.pathname.startsWith("/dashboard"));
  return yield* Match.value(dashboard).pipe(
    Match.when(true, () => active_account),
    Match.orElse(() => Effect.succeed(Option.none<string>())),
  );
});

export const init = () => {
  ClientRuntime.make(
    Layer.mergeAll(
      CoreApi.layer(
        import.meta.env.DEV ? globalThis.location.origin : VITE_CORE_API_URL,
        globalThis.fetch.bind(globalThis),
        request_account,
      ),
      HandoffChannel.layer,
    ),
  );
};
