import { Data, Effect, Option, Schema } from "effect";
import { Base64url32, CoreApi } from "@artisanstreet/core-client";
import {
  forget,
  OauthProblem,
  problem_slug,
  provider_of,
  sign_in_url_with,
  start_provider,
  type PageUrl,
  type Provider,
} from "../sign-in/oauth.ts";

const Port = Schema.Int.check(Schema.isBetween({ minimum: 1024, maximum: 65535 }));

const is_port = Schema.is(Port);

const is_token = Schema.is(Base64url32);

const DesktopHandoff = Schema.Struct({
  port: Port,
  challenge: Base64url32,
  state: Base64url32,
});

export type DesktopHandoff = typeof DesktopHandoff.Type;

export type DesktopRequest = Data.TaggedEnum<{
  Valid: { readonly provider: Provider; readonly handoff: DesktopHandoff };
  Invalid: {};
}>;

export const DesktopRequest = Data.taggedEnum<DesktopRequest>();

const port_of = (url: PageUrl): Option.Option<number> =>
  Option.fromNullishOr(url.searchParams.get("port")).pipe(
    Option.filter((raw) => /^[0-9]{4,5}$/.test(raw)),
    Option.map(Number),
    Option.filter(is_port),
  );

const token_of = (url: PageUrl, name: string): Option.Option<string> =>
  Option.fromNullishOr(url.searchParams.get(name)).pipe(Option.filter(is_token));

export const desktop_request_of = (url: PageUrl): DesktopRequest =>
  Option.all({
    provider: provider_of(url),
    handoff: Option.all({ port: port_of(url), challenge: token_of(url, "challenge"), state: token_of(url, "state") }),
  }).pipe(
    Option.match({
      onNone: () => DesktopRequest.Invalid(),
      onSome: ({ provider, handoff }) => DesktopRequest.Valid({ provider, handoff }),
    }),
  );

export class HandoffLost extends Data.TaggedError("HandoffLost") {}

const handoff_key = "artisan.auth.desktop";

const decode_handoff = Schema.decodeUnknownOption(Schema.fromJsonString(DesktopHandoff));

export const remember_handoff = (handoff: DesktopHandoff) =>
  Effect.try({
    try: () => sessionStorage.setItem(handoff_key, JSON.stringify(handoff)),
    catch: () => new HandoffLost(),
  });

export const recall_handoff: Effect.Effect<Option.Option<DesktopHandoff>> = Effect.try({
  try: () => sessionStorage.getItem(handoff_key),
  catch: () => new HandoffLost(),
}).pipe(
  Effect.map((raw) => Option.fromNullishOr(raw).pipe(Option.flatMap(decode_handoff))),
  Effect.catch(() => Effect.succeedNone),
);

const forget_handoff = Effect.try({
  try: () => sessionStorage.removeItem(handoff_key),
  catch: () => new HandoffLost(),
}).pipe(Effect.ignore);

export type DesktopProblem = Data.TaggedEnum<{
  Oauth: { readonly problem: OauthProblem };
  Lost: {};
  Cancelled: {};
  Expired: {};
}>;

export const DesktopProblem = Data.taggedEnum<DesktopProblem>();

export const desktop_slug = DesktopProblem.$match({
  Oauth: ({ problem }) => problem_slug(problem),
  Lost: () => "lost",
  Cancelled: () => "cancelled",
  Expired: () => "expired",
});

const known_problems: ReadonlyArray<DesktopProblem> = [
  DesktopProblem.Oauth({ problem: OauthProblem.Denied() }),
  DesktopProblem.Oauth({ problem: OauthProblem.Unavailable() }),
  DesktopProblem.Oauth({ problem: OauthProblem.NoVerifiedEmail() }),
  DesktopProblem.Oauth({ problem: OauthProblem.EmailTaken() }),
  DesktopProblem.Lost(),
  DesktopProblem.Cancelled(),
  DesktopProblem.Expired(),
];

const unavailable = DesktopProblem.Oauth({ problem: OauthProblem.Unavailable() });

const loopback_url = (handoff: DesktopHandoff, params: Record<string, string>): string =>
  `http://127.0.0.1:${handoff.port}/callback?${new URLSearchParams(params)}`;

export const granted_url = (handoff: DesktopHandoff, code: string): string =>
  loopback_url(handoff, { code, state: handoff.state });

export const refused_url = (handoff: DesktopHandoff, problem: DesktopProblem): string =>
  loopback_url(handoff, { state: handoff.state, error: desktop_slug(problem) });

export type Setback = Data.TaggedEnum<{
  Provider: { readonly provider: Provider; readonly problem: OauthProblem };
  Lost: {};
  Failed: {};
}>;

export const Setback = Data.taggedEnum<Setback>();

export type Back = Data.TaggedEnum<{
  SignIn: { readonly url: string };
  Editor: { readonly url: string };
  Stay: {};
}>;

export const Back = Data.taggedEnum<Back>();

const desktop_problem_of = Setback.$match({
  Provider: ({ problem }) => DesktopProblem.Oauth({ problem }),
  Lost: () => DesktopProblem.Lost(),
  Failed: () => unavailable,
});

const web_back_of = Setback.$match({
  Provider: ({ provider, problem }) => Back.SignIn({ url: sign_in_url_with(provider, problem) }),
  Lost: () => Back.Stay(),
  Failed: () => Back.Stay(),
});

export const back_of = (handoff: Option.Option<DesktopHandoff>, setback: Setback): Back =>
  Option.match(handoff, {
    onNone: () => web_back_of(setback),
    onSome: (pending) => Back.Editor({ url: refused_url(pending, desktop_problem_of(setback)) }),
  });

export const leave_for_editor = (url: string) =>
  Effect.gen(function* () {
    yield* forget_handoff;
    yield* forget;
    yield* Effect.sync(() => window.location.replace(url));
  });

export const start_desktop = (provider: Provider, handoff: DesktopHandoff, destination: string) =>
  Effect.gen(function* () {
    yield* remember_handoff(handoff);
    yield* start_provider(provider, destination);
  }).pipe(Effect.catch(() => leave_for_editor(refused_url(handoff, unavailable))));

export const grant_desktop = (handoff: DesktopHandoff) =>
  Effect.gen(function* () {
    const api = yield* CoreApi;
    const { code } = yield* api.desktop_grant(handoff.challenge);
    yield* leave_for_editor(granted_url(handoff, code));
  }).pipe(Effect.catch(() => leave_for_editor(refused_url(handoff, unavailable))));

export type DesktopView = Data.TaggedEnum<{
  Connecting: { readonly provider: Provider };
  Granting: {};
  Incomplete: {};
}>;

export const DesktopView = Data.taggedEnum<DesktopView>();

export const incomplete_message = "This sign-in link is incomplete. Start again from Artisan Editor.";

export type DesktopDone = Data.TaggedEnum<{
  SignedIn: {};
  Failed: { readonly problem: Option.Option<DesktopProblem> };
}>;

export const DesktopDone = Data.taggedEnum<DesktopDone>();

export const desktop_done_of = (url: PageUrl): DesktopDone =>
  Option.match(Option.fromNullishOr(url.searchParams.get("problem")), {
    onNone: () => DesktopDone.SignedIn(),
    onSome: (slug) =>
      DesktopDone.Failed({
        problem: Option.fromNullishOr(known_problems.find((problem) => desktop_slug(problem) === slug)),
      }),
  });

const problem_message = DesktopProblem.$match({
  Oauth: ({ problem }) =>
    OauthProblem.$match(problem, {
      Denied: () => "The sign-in was cancelled with your provider. Start again from Artisan Editor.",
      Unavailable: () => "We couldn't finish signing you in. Try again from Artisan Editor in a moment.",
      NoVerifiedEmail: () =>
        "Your provider didn't share a verified email with us. Verify it there, then start again from Artisan Editor.",
      EmailTaken: () =>
        "That email already signs in another way. Use that method when you start again from Artisan Editor.",
    }),
  Lost: () => "This browser lost track of the sign-in. Start again from Artisan Editor.",
  Cancelled: () => "Artisan Editor stopped waiting for this sign-in. Start again from the app if you still want in.",
  Expired: () => "This sign-in timed out before Artisan Editor got it. Start again from the app.",
});

export const done_message = (problem: Option.Option<DesktopProblem>): string =>
  Option.match(problem, {
    onNone: () => "Artisan Editor couldn't finish signing in. Start again from the app.",
    onSome: problem_message,
  });
