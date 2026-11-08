import { Effect, Fiber, Layer, Option, PubSub } from "effect";
import { TestClock } from "effect/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { CoreApi, type LoginStatus, type MagicConsumeResp } from "@artisanstreet/core-client";
import { Approval, approval_of, approve } from "../../../../src/lib/auth/sign-in/approve.ts";
import { Handoff, HandoffChannel } from "../../../../src/lib/auth/sign-in/handoff.ts";
import { store_secret } from "../../../../src/lib/auth/sign-in/storage.ts";

const consumed = (status: LoginStatus, totp_required = false): MagicConsumeResp => ({
  request_id: "logreq_1",
  status,
  totp_required,
});

const login = (totp_required: boolean) => ({
  request_id: "logreq_1",
  email: "",
  expires_at: "",
  phase: "email_approved" as const,
  totp_required,
});

describe("approval_of", () => {
  it("reports an expired link whatever else is true", () => {
    expect(approval_of(consumed("expired"), true, Option.some("secret"))).toEqual(Approval.Expired());
  });

  it("hands off to the original tab when it answers", () => {
    expect(approval_of(consumed("email_approved"), true, Option.some("secret"))).toEqual(Approval.Handed());
    expect(approval_of(consumed("email_approved"), true, Option.none())).toEqual(Approval.Handed());
  });

  it("offers to continue here when this browser holds the secret", () => {
    expect(approval_of(consumed("email_approved", true), false, Option.some("secret"))).toEqual(
      Approval.SameBrowser({ login: login(true) }),
    );
  });

  it("sends the user back to their device without the secret", () => {
    expect(approval_of(consumed("email_approved"), false, Option.none())).toEqual(Approval.OtherDevice());
  });
});

const core = (status: LoginStatus) =>
  Layer.mock(CoreApi)({
    consume_magic_link: () => Effect.succeed(consumed(status)),
  });

const channel = (original_tab_open: boolean) =>
  Layer.effect(
    HandoffChannel,
    Effect.gen(function* () {
      const pubsub = yield* PubSub.unbounded<Handoff>();
      return {
        post: (message: Handoff) =>
          original_tab_open && Handoff.guards.Approved(message)
            ? PubSub.publish(pubsub, Handoff.cases.Present.make({ request_id: message.request_id })).pipe(Effect.asVoid)
            : Effect.void,
        subscribe: PubSub.subscribe(pubsub),
      };
    }),
  );

const run_approve = (original_tab_open: boolean) =>
  Effect.gen(function* () {
    const fiber = yield* Effect.forkChild(approve("token"));
    yield* TestClock.adjust("1 second");
    return yield* Fiber.join(fiber);
  }).pipe(
    Effect.provide(Layer.mergeAll(core("email_approved"), channel(original_tab_open), TestClock.layer())),
    Effect.runPromise,
  );

describe("approve", () => {
  beforeEach(() => localStorage.clear());

  it("lets the original tab take over when it answers the signal", async () => {
    await Effect.runPromise(store_secret("logreq_1", "secret"));
    expect(await run_approve(true)).toEqual(Approval.Handed());
  });

  it("offers to continue here when nobody answers and the secret is stored", async () => {
    await Effect.runPromise(store_secret("logreq_1", "secret"));
    expect(await run_approve(false)).toEqual(Approval.SameBrowser({ login: login(false) }));
  });

  it("points at the other device when nobody answers and there is no secret", async () => {
    expect(await run_approve(false)).toEqual(Approval.OtherDevice());
  });
});
