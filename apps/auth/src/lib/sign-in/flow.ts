import { Data, Effect, Match, Option, Queue, Schedule, Stream } from "effect";
import { CoreApi, is_transient, SecondFactor, type MagicRequestResp, type MagicStatusResp } from "@artisanstreet/core-client";
import { approved_for, Handoff, HandoffChannel } from "./handoff.ts";
import { friendly_error, type SignInFailure } from "./messages.ts";
import { finalize_payload, RequestLost, type LoginState } from "./state.ts";
import { clear_secret, load_secret, store_secret } from "./storage.ts";
import type { OauthProblem, Provider } from "./oauth.ts";

export type FinishProblem = Data.TaggedEnum<{
  CodeRejected: {};
  Failed: { readonly message: string };
}>;

export const FinishProblem = Data.taggedEnum<FinishProblem>();

export type Flow = Data.TaggedEnum<{
  Idle: {};
  Redirecting: { readonly provider: Provider };
  ProviderFailed: { readonly provider: Provider; readonly problem: OauthProblem };
  Sending: {};
  Waiting: { readonly login: LoginState };
  Approved: { readonly login: LoginState; readonly error: Option.Option<FinishProblem> };
  Finishing: { readonly login: LoginState };
  Expired: {};
  Failed: { readonly message: string };
  SignedIn: { readonly destination: string };
}>;

export const Flow = Data.taggedEnum<Flow>();

export type Emit = (flow: Flow) => Effect.Effect<void>;

const pending_login = (email: string, response: MagicRequestResp): LoginState => ({
  request_id: response.request_id,
  email,
  expires_at: response.expires_at,
  phase: "pending",
  totp_required: false,
});

const settle = (login: LoginState, status: MagicStatusResp): LoginState => ({
  ...login,
  phase: status.status,
  totp_required: status.totp_required,
  email: status.email,
  expires_at: status.expires_at,
});

const request = (email: string) =>
  Effect.gen(function* () {
    const api = yield* CoreApi;
    const response = yield* api.request_magic_link(email);
    yield* store_secret(response.request_id, response.request_secret);
    return pending_login(email, response);
  });

const status_of = (login: LoginState) =>
  Effect.gen(function* () {
    const api = yield* CoreApi;
    const secret = yield* load_secret(login.request_id);
    const request_secret = yield* Effect.fromOption(secret).pipe(Effect.mapError(() => new RequestLost()));
    return yield* api
      .login_status(login.request_id, request_secret)
      .pipe(Effect.retry({ while: is_transient, times: 10, schedule: Schedule.spaced("3 seconds") }));
  });

const await_settled = (
  login: LoginState,
  wake: Effect.Effect<void>,
): Effect.Effect<LoginState, Effect.Error<ReturnType<typeof status_of>>, CoreApi> =>
  status_of(login).pipe(
    Effect.map((status) => settle(login, status)),
    Effect.flatMap((next) =>
      next.phase === "pending"
        ? Effect.raceFirst(Effect.sleep("3 seconds"), wake).pipe(
            Effect.andThen(Effect.suspend(() => await_settled(next, wake))),
          )
        : Effect.succeed(next),
    ),
  );

const answer_handoffs = (login: LoginState, wake: Queue.Queue<void>) =>
  Effect.gen(function* () {
    const channel = yield* HandoffChannel;
    const subscription = yield* channel.subscribe;
    yield* Stream.fromSubscription(subscription).pipe(
      Stream.filter(approved_for(login.request_id)),
      Stream.runForEach(() =>
        channel
          .post(Handoff.cases.Present.make({ request_id: login.request_id }))
          .pipe(Effect.andThen(Queue.offer(wake, undefined))),
      ),
      Effect.forkScoped,
    );
  });

const await_approval = (login: LoginState) =>
  Effect.scoped(
    Effect.gen(function* () {
      const wake = yield* Queue.sliding<void>(1);
      yield* answer_handoffs(login, wake);
      return yield* await_settled(login, Queue.take(wake));
    }),
  );

export const finish_problem = (failure: SignInFailure, factor: SecondFactor): FinishProblem =>
  failure._tag === "ApiFailure" && failure.status === 403 && !SecondFactor.$is("None")(factor)
    ? FinishProblem.CodeRejected()
    : FinishProblem.Failed({ message: friendly_error(failure) });

const finalize = (login: LoginState, factor: SecondFactor) =>
  Effect.gen(function* () {
    const api = yield* CoreApi;
    const secret = yield* load_secret(login.request_id);
    const payload = yield* finalize_payload(login, factor, secret);
    yield* api.finalize_magic_link(payload);
  });

export const complete = (login: LoginState, factor: SecondFactor, destination: string, emit: Emit) =>
  Effect.gen(function* () {
    const api = yield* CoreApi;
    yield* emit(Flow.Finishing({ login }));
    yield* login.phase === "completed" ? Effect.void : finalize(login, factor);
    yield* api.me;
    yield* clear_secret(login.request_id);
    yield* emit(Flow.SignedIn({ destination }));
  }).pipe(
    Effect.catch((failure) =>
      emit(
        login.phase === "completed"
          ? Flow.Failed({ message: friendly_error(failure) })
          : Flow.Approved({ login, error: Option.some(finish_problem(failure, factor)) }),
      ),
    ),
  );

const settled = (login: LoginState, destination: string, emit: Emit) =>
  Match.value(login.phase).pipe(
    Match.when("email_approved", () =>
      login.totp_required
        ? emit(Flow.Approved({ login, error: Option.none() }))
        : complete(login, SecondFactor.None(), destination, emit),
    ),
    Match.when("completed", () => complete(login, SecondFactor.None(), destination, emit)),
    Match.when("expired", () => clear_secret(login.request_id).pipe(Effect.andThen(emit(Flow.Expired())))),
    Match.when("pending", () => emit(Flow.Waiting({ login }))),
    Match.exhaustive,
  );

export const sign_in = (email: string, destination: string, emit: Emit) =>
  Effect.gen(function* () {
    yield* emit(Flow.Sending());
    const login = yield* request(email.trim());
    yield* emit(Flow.Waiting({ login }));
    const result = yield* await_approval(login).pipe(Effect.tapError(() => clear_secret(login.request_id)));
    yield* settled(result, destination, emit);
  }).pipe(Effect.catch((failure) => emit(Flow.Failed({ message: friendly_error(failure) }))));

const none = () => Option.none<string>();

const login_of = Flow.$match({
  Idle: () => Option.none<LoginState>(),
  Redirecting: () => Option.none<LoginState>(),
  ProviderFailed: () => Option.none<LoginState>(),
  Sending: () => Option.none<LoginState>(),
  Waiting: ({ login }) => Option.some(login),
  Approved: ({ login }) => Option.some(login),
  Finishing: ({ login }) => Option.some(login),
  Expired: () => Option.none<LoginState>(),
  Failed: () => Option.none<LoginState>(),
  SignedIn: () => Option.none<LoginState>(),
});

export const abandon = (flow: Flow): Effect.Effect<void> =>
  Option.match(login_of(flow), {
    onNone: () => Effect.void,
    onSome: (login) => clear_secret(login.request_id),
  });

export const failure_message = Flow.$match({
  Idle: none,
  Redirecting: none,
  ProviderFailed: none,
  Sending: none,
  Waiting: none,
  Approved: ({ error }) =>
    Option.flatMap(
      error,
      FinishProblem.$match({ CodeRejected: () => Option.none<string>(), Failed: ({ message }) => Option.some(message) }),
    ),
  Finishing: none,
  Expired: () => Option.some("This sign-in link has expired. Request a fresh one and open it within a few minutes."),
  Failed: ({ message }) => Option.some(message),
  SignedIn: none,
});

const unchanged = (flow: Flow): Flow => flow;

export const edited: (flow: Flow) => Flow = Flow.$match({
  Idle: unchanged,
  Redirecting: unchanged,
  ProviderFailed: () => Flow.Idle(),
  Sending: unchanged,
  Waiting: unchanged,
  Approved: ({ login }) => Flow.Approved({ login, error: Option.none() }),
  Finishing: unchanged,
  Expired: () => Flow.Idle(),
  Failed: () => Flow.Idle(),
  SignedIn: unchanged,
});
