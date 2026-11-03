import { Data, Effect, Match, Option, Stream } from "effect";
import { CoreApi, type MagicConsumeResp } from "@artisanstreet/core-client";
import { Handoff, HandoffChannel, present_for } from "./handoff.ts";
import { friendly_error } from "./messages.ts";
import type { LoginState } from "./state.ts";
import { load_secret } from "./storage.ts";

export type Approval = Data.TaggedEnum<{
  Ready: {};
  Approving: {};
  Handed: {};
  SameBrowser: { readonly login: LoginState };
  OtherDevice: {};
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

export const approval_of = (consumed: MagicConsumeResp, present: boolean, secret: Option.Option<string>): Approval =>
  Match.value({ status: consumed.status, present }).pipe(
    Match.when({ status: "expired" }, () => Approval.Expired()),
    Match.when({ present: true }, () => Approval.Handed()),
    Match.orElse(() =>
      Option.match(secret, {
        onNone: () => Approval.OtherDevice(),
        onSome: () => Approval.SameBrowser({ login: approved_login(consumed) }),
      }),
    ),
  );

const announce = (request_id: string) =>
  Effect.scoped(
    Effect.gen(function* () {
      const channel = yield* HandoffChannel;
      const subscription = yield* channel.subscribe;
      yield* channel.post(Handoff.cases.Approved.make({ request_id }));
      const reply = yield* Stream.fromSubscription(subscription).pipe(
        Stream.filter(present_for(request_id)),
        Stream.runHead,
        Effect.timeoutOption("1 second"),
      );
      return Option.isSome(Option.flatten(reply));
    }),
  );

export const approve = (token: string): Effect.Effect<Approval, never, CoreApi | HandoffChannel> =>
  Effect.gen(function* () {
    const api = yield* CoreApi;
    const consumed = yield* api.consume_magic_link(token);
    const present = yield* consumed.status === "expired" ? Effect.succeed(false) : announce(consumed.request_id);
    const secret = yield* load_secret(consumed.request_id);
    return approval_of(consumed, present, secret);
  }).pipe(Effect.catch((failure) => Effect.succeed(Approval.Failed({ message: friendly_error(failure) }))));

export const without_token = (url: URL): URL => {
  const scrubbed = new URL(url);
  scrubbed.searchParams.delete("token");
  return scrubbed;
};
