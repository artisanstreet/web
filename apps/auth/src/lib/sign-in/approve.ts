import { Data, Effect, Match, Option } from "effect";
import { CoreApi } from "../core/api.ts";
import type { MagicConsumeResp } from "../core/contract.ts";
import { friendly_error } from "./messages.ts";
import type { LoginState } from "./state.ts";
import { load_secret } from "./storage.ts";

export type Approval = Data.TaggedEnum<{
  Ready: {};
  Approving: {};
  SameTab: { readonly login: LoginState };
  OtherTab: {};
  Expired: {};
  Failed: { readonly message: string };
}>;

export const Approval = Data.taggedEnum<Approval>();

const approved_login = (consumed: MagicConsumeResp): LoginState => ({
  request_id: consumed.request_id,
  email: "",
  expires_at: "",
  phase: consumed.status,
  totp_required: consumed.totp_required,
});

export const approve = (token: string): Effect.Effect<Approval, never, CoreApi> =>
  Effect.gen(function* () {
    const api = yield* CoreApi;
    const consumed = yield* api.consume_magic_link(token);
    const secret = yield* load_secret(consumed.request_id);
    return Match.value(consumed.status).pipe(
      Match.when("expired", () => Approval.Expired()),
      Match.orElse(() =>
        Option.match(secret, {
          onNone: () => Approval.OtherTab(),
          onSome: () => Approval.SameTab({ login: approved_login(consumed) }),
        }),
      ),
    );
  }).pipe(Effect.catch((failure) => Effect.succeed(Approval.Failed({ message: friendly_error(failure) }))));

export const without_token = (url: URL): URL => {
  const scrubbed = new URL(url);
  scrubbed.searchParams.delete("token");
  return scrubbed;
};
