import { Data, Effect, Match, Option, Schema } from "effect";
import {
  CoreApi,
  OauthProvider,
  SecondFactor,
  type OauthCallbackResp,
  type OauthFlowRef,
  type OauthStartResp,
} from "@artisanstreet/core-client";

export type Provider = typeof OauthProvider.Type;

const is_provider = Schema.is(OauthProvider);

export type OauthProblem = Data.TaggedEnum<{
  Denied: {};
  Unavailable: {};
  NoVerifiedEmail: {};
  EmailTaken: {};
}>;

export const OauthProblem = Data.taggedEnum<OauthProblem>();

export class FlowLost extends Data.TaggedError("FlowLost") {}

const PendingFlow = Schema.Struct({
  flow_id: Schema.String,
  flow_secret: Schema.String,
  provider: OauthProvider,
  destination: Schema.String,
});

export type PendingFlow = typeof PendingFlow.Type;

const pending_key = "artisan.auth.oauth";

const decode_pending = Schema.decodeUnknownEffect(Schema.fromJsonString(PendingFlow));

const remember = (pending: PendingFlow) =>
  Effect.try({
    try: () => sessionStorage.setItem(pending_key, JSON.stringify(pending)),
    catch: () => new FlowLost(),
  });

export const recall = Effect.gen(function* () {
  const raw = yield* Effect.try({ try: () => sessionStorage.getItem(pending_key), catch: () => new FlowLost() });
  const stored = yield* Effect.fromOption(Option.fromNullishOr(raw), () => new FlowLost());
  return yield* decode_pending(stored).pipe(Effect.mapError(() => new FlowLost()));
});

export const forget = Effect.try({ try: () => sessionStorage.removeItem(pending_key), catch: () => new FlowLost() }).pipe(
  Effect.ignore,
);

const follow = (provider: Provider, destination: string, started: OauthStartResp) =>
  Effect.gen(function* () {
    yield* remember({ flow_id: started.flow_id, flow_secret: started.flow_secret, provider, destination });
    yield* Effect.sync(() => window.location.assign(started.authorize_url));
  });

export const start_provider = (provider: Provider, destination: string) =>
  Effect.gen(function* () {
    const api = yield* CoreApi;
    const started = yield* api.start_oauth(provider);
    yield* follow(provider, destination, started);
  });

export const link_provider = (provider: Provider, account: Option.Option<string>, destination: string) =>
  Effect.gen(function* () {
    const api = yield* CoreApi;
    const started = yield* api.link_sign_in(provider, account);
    yield* follow(provider, destination, started);
  });

export interface PageUrl {
  readonly searchParams: Pick<URLSearchParams, "get">;
}

export const provider_of = (url: PageUrl): Option.Option<Provider> =>
  Option.fromNullishOr(url.searchParams.get("provider")).pipe(Option.filter(is_provider));

export const account_of = (url: PageUrl): Option.Option<string> =>
  Option.fromNullishOr(url.searchParams.get("account")).pipe(Option.filter((id) => /^acct_[A-Za-z0-9]+$/.test(id)));

const with_params = (destination: string, params: Record<string, string>): string => {
  const url = new URL(destination);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
};

const known_problems: ReadonlyArray<OauthProblem> = [
  OauthProblem.Denied(),
  OauthProblem.Unavailable(),
  OauthProblem.NoVerifiedEmail(),
  OauthProblem.EmailTaken(),
];

export const problem_slug = OauthProblem.$match({
  Denied: () => "denied",
  Unavailable: () => "unavailable",
  NoVerifiedEmail: () => "no-verified-email",
  EmailTaken: () => "email-taken",
});

export interface ProviderProblem {
  readonly provider: Provider;
  readonly problem: OauthProblem;
}

export const provider_problem_of = (url: PageUrl): Option.Option<ProviderProblem> =>
  Option.all({
    provider: provider_of(url),
    problem: Option.fromNullishOr(
      known_problems.find((problem) => problem_slug(problem) === url.searchParams.get("problem")),
    ),
  });

export const sign_in_url_with = (provider: Provider, problem: OauthProblem): string =>
  `/?${new URLSearchParams({ provider, problem: problem_slug(problem) })}`;

export interface Profile {
  readonly email: string;
  readonly display_name: string;
  readonly avatar_url: string | null;
}

export type Landing = Data.TaggedEnum<{
  Enter: { readonly destination: string };
  Back: { readonly problem: OauthProblem };
  SecondFactor: {};
  Signup: { readonly profile: Profile };
}>;

export const Landing = Data.taggedEnum<Landing>();

export const landing_of = (pending: PendingFlow, outcome: OauthCallbackResp): Landing =>
  Match.value(outcome).pipe(
    Match.discriminatorsExhaustive("outcome")({
      signed_in: () => Landing.Enter({ destination: pending.destination }),
      linked: ({ provider }) => Landing.Enter({ destination: with_params(pending.destination, { linked: provider }) }),
      linked_elsewhere: () =>
        Landing.Enter({
          destination: with_params(pending.destination, { link_problem: "elsewhere", provider: pending.provider }),
        }),
      second_factor_required: () => Landing.SecondFactor(),
      signup_required: ({ email, display_name, avatar_url }) =>
        Landing.Signup({ profile: { email, display_name, avatar_url } }),
      email_taken: () => Landing.Back({ problem: OauthProblem.EmailTaken() }),
      no_verified_email: () => Landing.Back({ problem: OauthProblem.NoVerifiedEmail() }),
    }),
  );

export type ProviderReturn = Data.TaggedEnum<{
  Code: { readonly code: string; readonly state: string };
  Refused: {};
  Malformed: {};
}>;

export const ProviderReturn = Data.taggedEnum<ProviderReturn>();

export const provider_return_of = (url: PageUrl): ProviderReturn => {
  const params = url.searchParams;
  return Match.value({ code: params.get("code"), state: params.get("state"), error: params.get("error") }).pipe(
    Match.when({ error: Match.string }, () => ProviderReturn.Refused()),
    Match.when({ code: Match.string, state: Match.string }, ({ code, state }) => ProviderReturn.Code({ code, state })),
    Match.orElse(() => ProviderReturn.Malformed()),
  );
};

const flow_ref = (pending: PendingFlow): OauthFlowRef => ({
  flow_id: pending.flow_id,
  flow_secret: pending.flow_secret,
});

export const exchange = (pending: PendingFlow, code: string, state: string) =>
  Effect.gen(function* () {
    const api = yield* CoreApi;
    const outcome = yield* api.oauth_callback(flow_ref(pending), state, code);
    return landing_of(pending, outcome);
  });

const enter = (pending: PendingFlow) =>
  Effect.gen(function* () {
    const api = yield* CoreApi;
    yield* api.me;
    yield* forget;
    yield* Effect.sync(() => window.location.assign(pending.destination));
  });

export const finish_second_factor = (pending: PendingFlow, factor: SecondFactor) =>
  Effect.gen(function* () {
    const api = yield* CoreApi;
    yield* api.oauth_second_factor(flow_ref(pending), factor);
    yield* enter(pending);
  });

export const finish_signup = (pending: PendingFlow, display_name: string) =>
  Effect.gen(function* () {
    const api = yield* CoreApi;
    yield* api.oauth_signup(flow_ref(pending), display_name.trim());
    yield* enter(pending);
  });

export const leave_for = (destination: string) =>
  Effect.gen(function* () {
    yield* forget;
    yield* Effect.sync(() => window.location.assign(destination));
  });

export type Callback = Data.TaggedEnum<{
  Working: {};
  SecondFactor: { readonly pending: PendingFlow; readonly error: Option.Option<string>; readonly verifying: boolean };
  Signup: {
    readonly pending: PendingFlow;
    readonly profile: Profile;
    readonly error: Option.Option<string>;
    readonly creating: boolean;
  };
  Lost: {};
  Failed: { readonly message: string };
}>;

export const Callback = Data.taggedEnum<Callback>();

export const provider_names: Record<Provider, string> = { google: "Google", github: "GitHub" };

export type LinkView = Data.TaggedEnum<{
  Working: { readonly provider: Provider };
  Failed: { readonly message: string };
}>;

export const LinkView = Data.taggedEnum<LinkView>();
