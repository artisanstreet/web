import { Effect, Option } from "effect";
import { CoreApi, type ApiFailure } from "@artisanstreet/core-client";
import { account_of, Session, signed_in_account } from "./account.ts";
import { next_active, remember, remembered } from "./active.ts";

const auth_origin = "/auth";

const here = () => `${window.location.pathname}${window.location.search}`;

export const add_account_url = () => `${auth_origin}?${new URLSearchParams({ return_to: here() })}`;

const send_to_sign_in = Effect.sync((): Session => {
  window.location.assign(add_account_url());
  return Session.Loading();
});

const refused = (failure: ApiFailure): Effect.Effect<Session> =>
  failure.status === 401 ? send_to_sign_in : Effect.succeed(Session.Unreachable());

const settle_active = Effect.gen(function* () {
  const api = yield* CoreApi;
  const signed = yield* api.signed_in_accounts;
  const ids = signed.accounts.map((account) => account.account_id);
  const active = next_active(yield* remembered, ids);
  yield* Option.match(active, {
    onNone: () => Effect.void,
    onSome: (id) => remember({ active: id, known: ids }),
  });
  return { active, accounts: signed.accounts.map(signed_in_account) };
});

export const load_session = Effect.gen(function* () {
  const api = yield* CoreApi;
  const { active, accounts } = yield* settle_active;
  return yield* Option.match(active, {
    onNone: () => send_to_sign_in,
    onSome: () =>
      Effect.map(api.me, (me): Session => Session.SignedIn({ account: account_of(me), accounts })),
  });
}).pipe(
  Effect.catchTag("ApiFailure", refused),
  Effect.catch(() => Effect.succeed(Session.Unreachable())),
);

export const switch_to = (account_id: string) =>
  Effect.gen(function* () {
    const known = yield* remembered;
    yield* remember({
      active: account_id,
      known: Option.match(known, { onNone: () => [account_id], onSome: (state) => state.known }),
    });
    yield* Effect.sync(() => window.location.reload());
  });

export const after_sign_out = Effect.gen(function* () {
  const { active } = yield* settle_active;
  yield* Option.match(active, {
    onNone: () => Effect.sync(() => window.location.assign(auth_origin)),
    onSome: () => Effect.sync(() => window.location.reload()),
  });
});

export const sign_out = Effect.gen(function* () {
  const api = yield* CoreApi;
  yield* api.revoke_current_session;
  yield* after_sign_out;
});

export const disable_account = Effect.gen(function* () {
  const api = yield* CoreApi;
  yield* api.disable_account;
  yield* after_sign_out;
});
