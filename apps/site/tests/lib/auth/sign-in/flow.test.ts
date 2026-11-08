import { Effect, Fiber, Layer, Option, PubSub } from "effect";
import { TestClock } from "effect/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { ApiFailure, CoreApi, SecondFactor, TransportFailure, type LoginStatus } from "@artisanstreet/core-client";
import { edited, finish_problem, FinishProblem, Flow, sign_in } from "../../../../src/lib/auth/sign-in/flow.ts";
import { Handoff, HandoffChannel } from "../../../../src/lib/auth/sign-in/handoff.ts";
import { friendly_error } from "../../../../src/lib/auth/sign-in/messages.ts";
import type { LoginState } from "../../../../src/lib/auth/sign-in/state.ts";

const forbidden = new ApiFailure({ status: 403, code: "forbidden", message: "second factor required", request_id: "r" });

describe("finish_problem", () => {
  it("treats a refused code as a rejected code", () => {
    expect(finish_problem(forbidden, SecondFactor.Totp({ code: "123456" }))).toEqual(FinishProblem.CodeRejected());
    expect(finish_problem(forbidden, SecondFactor.Recovery({ code: "k7f2" }))).toEqual(FinishProblem.CodeRejected());
  });

  it("keeps the service's reason when no code was sent", () => {
    expect(finish_problem(forbidden, SecondFactor.None())).toEqual(
      FinishProblem.Failed({ message: friendly_error(forbidden) }),
    );
  });

  it("does not blame the code for transport or rate-limit failures", () => {
    const limited = new ApiFailure({ status: 429, code: "rate_limited", message: "slow down", request_id: "r" });
    expect(finish_problem(new TransportFailure(), SecondFactor.Totp({ code: "123456" }))).toEqual(
      FinishProblem.Failed({ message: friendly_error(new TransportFailure()) }),
    );
    expect(finish_problem(limited, SecondFactor.Totp({ code: "123456" }))).toEqual(
      FinishProblem.Failed({ message: friendly_error(limited) }),
    );
  });
});

describe("edited", () => {
  const login: LoginState = {
    request_id: "logreq_1",
    email: "ada@artisan.email",
    expires_at: "",
    phase: "email_approved",
    totp_required: true,
  };

  it("clears a finishing problem once the code changes", () => {
    expect(edited(Flow.Approved({ login, error: Option.some(FinishProblem.CodeRejected()) }))).toEqual(
      Flow.Approved({ login, error: Option.none() }),
    );
  });

  it("returns to the form after a terminal failure", () => {
    expect(edited(Flow.Failed({ message: "nope" }))).toEqual(Flow.Idle());
    expect(edited(Flow.Expired())).toEqual(Flow.Idle());
  });

  it("leaves a running request alone", () => {
    expect(edited(Flow.Waiting({ login }))).toEqual(Flow.Waiting({ login }));
  });
});

const harness = Effect.gen(function* () {
  const pubsub = yield* PubSub.unbounded<Handoff>();
  const posted: Array<Handoff> = [];
  const statuses: Array<LoginStatus> = ["pending"];
  const checks = { count: 0 };
  const api = Layer.mock(CoreApi)({
    request_magic_link: () =>
      Effect.succeed({ request_id: "logreq_1", request_secret: "secret", expires_at: "2026-10-29T12:00:00Z" }),
    login_status: () =>
      Effect.sync(() => {
        checks.count += 1;
        return {
          request_id: "logreq_1",
          status: statuses[checks.count - 1] ?? "email_approved",
          totp_required: true,
          email: "ada@artisan.email",
          expires_at: "2026-10-29T12:00:00Z",
        };
      }),
  });
  const channel = Layer.succeed(HandoffChannel, {
    post: (message: Handoff) => Effect.sync(() => void posted.push(message)),
    subscribe: PubSub.subscribe(pubsub),
  });
  return { pubsub, posted, checks, layer: Layer.mergeAll(api, channel) };
});

const settle = (done: () => boolean) =>
  Effect.yieldNow.pipe(
    Effect.andThen(Effect.sync(done)),
    Effect.repeat({ until: (ready) => ready, times: 1000 }),
  );

const run = <A>(body: (h: Effect.Success<typeof harness>) => Effect.Effect<A, never, CoreApi | HandoffChannel>) =>
  Effect.gen(function* () {
    const h = yield* harness;
    return yield* body(h).pipe(Effect.provide(h.layer));
  }).pipe(Effect.provide(TestClock.layer()), Effect.runPromise);

describe("sign_in waiting for approval", () => {
  beforeEach(() => localStorage.clear());

  it("re-checks at once and answers when the approve tab signals", async () => {
    const result = await run((h) =>
      Effect.gen(function* () {
        const flows: Array<Flow> = [];
        const fiber = yield* Effect.forkChild(
          sign_in("ada@artisan.email", "/", (flow) => Effect.sync(() => void flows.push(flow))),
        );
        yield* settle(() => h.checks.count === 1);
        yield* PubSub.publish(h.pubsub, Handoff.cases.Approved.make({ request_id: "logreq_1" }));
        yield* Fiber.join(fiber);
        return { flows, posted: h.posted, checks: h.checks.count };
      }),
    );
    expect(result.checks).toBe(2);
    expect(result.posted).toEqual([Handoff.cases.Present.make({ request_id: "logreq_1" })]);
    expect(result.flows.map((flow) => flow._tag)).toEqual(["Sending", "Waiting", "Approved"]);
  });

  it("ignores signals for other requests and keeps polling", async () => {
    const result = await run((h) =>
      Effect.gen(function* () {
        const fiber = yield* Effect.forkChild(sign_in("ada@artisan.email", "/", () => Effect.void));
        yield* settle(() => h.checks.count === 1);
        yield* PubSub.publish(h.pubsub, Handoff.cases.Approved.make({ request_id: "logreq_2" }));
        yield* settle(() => false);
        const before_poll = h.checks.count;
        yield* TestClock.adjust("3 seconds");
        yield* Fiber.join(fiber);
        return { before_poll, after_poll: h.checks.count, posted: h.posted };
      }),
    );
    expect(result.before_poll).toBe(1);
    expect(result.after_poll).toBe(2);
    expect(result.posted).toEqual([]);
  });
});
