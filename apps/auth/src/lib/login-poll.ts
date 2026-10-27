// Approval polling over Effect. The originating tab polls login_status until
// the emailed link is approved; transient failures back off. Terminal answers
// stop immediately. Cancellation is AbortSignal-scoped plus Query-aware: the
// caller owns a single poll per request_id (no duplicate request loops) and
// interrupts the fiber on unmount / resend / expired / completed.

import { Cause, Effect, Fiber } from "effect";
import { ApiFailure, to_legacy_error } from "@artisanstreet/core-client";
import { login_status_effect } from "@artisanstreet/core-client";
import type { HttpSeam } from "@artisanstreet/core-client";

export type LoginPollStatus = "pending" | "email_approved" | "completed" | "expired";

export interface LoginPollResult {
  readonly status: LoginPollStatus;
  readonly totp_required: boolean;
  readonly email: string;
  readonly expires_at: string;
}

export interface LoginPollCallbacks {
  readonly on_approved: (result: LoginPollResult) => void;
  readonly on_completed: (result: LoginPollResult) => void;
  readonly on_expired: () => void;
  readonly on_transient: (attempt: number) => void;
  readonly on_terminal: (message: string) => void;
  readonly is_cancelled: () => boolean;
  readonly format_error: (err: unknown) => string;
}

const MAX_TRANSIENT = 10;

const run_effect = <A>(effect: Effect.Effect<A, unknown>): Promise<A> =>
  Effect.runPromiseExit(effect).then((exit) => {
    if (exit._tag === "Success") return exit.value;
    const failure = Cause.failureOption(exit.cause);
    if (failure._tag === "Some") {
      const value = failure.value;
      throw value instanceof Error ? value : new Error("Operation failed.");
    }
    const squashed = Cause.squash(exit.cause);
    throw squashed instanceof Error ? squashed : new Error("Operation failed.");
  });

export const start_login_poll = (
  http: HttpSeam,
  request_id: string,
  get_secret: () => string | null,
  callbacks: LoginPollCallbacks,
  abort_signal: AbortSignal,
): (() => void) => {
  let stopped = false;
  const on_abort = (): void => {
    stopped = true;
  };
  abort_signal.addEventListener("abort", on_abort, { once: true });

  const loop = Effect.gen(function* () {
    let attempt = 0;
    for (;;) {
      if (stopped || callbacks.is_cancelled()) return;
      const secret = get_secret();
      if (!secret) {
        yield* Effect.sync(() =>
          callbacks.on_terminal("This browser lost track of the request. Start over."),
        );
        return;
      }
      const settled = yield* Effect.either(login_status_effect(http.fetch_impl, http.base, request_id, secret));
      if (settled._tag === "Right") {
        const s = settled.right;
        const mapped: LoginPollResult = {
          status: s.status,
          totp_required: s.totp_required,
          email: s.email,
          expires_at: s.expires_at,
        };
        attempt = 0;
        if (s.status === "email_approved") {
          yield* Effect.sync(() => callbacks.on_approved(mapped));
          return;
        }
        if (s.status === "completed") {
          yield* Effect.sync(() => callbacks.on_completed(mapped));
          return;
        }
        if (s.status === "expired") {
          yield* Effect.sync(() => callbacks.on_expired());
          return;
        }
      } else {
        const err = settled.left;
        const transient = err instanceof ApiFailure ? err.status >= 500 : true;
        if (transient) {
          attempt += 1;
          if (attempt <= MAX_TRANSIENT) {
            yield* Effect.sync(() => callbacks.on_transient(attempt));
            yield* Effect.sleep(`${3000 + attempt * 1000} millis`);
            continue;
          }
        }
        const message = callbacks.format_error(to_legacy_error(err));
        yield* Effect.sync(() => callbacks.on_terminal(message));
        return;
      }
      yield* Effect.sleep("3 seconds");
    }
  });

  const fiber = Effect.runFork(loop.pipe(Effect.catchAll(() => Effect.void)));
  return () => {
    stopped = true;
    abort_signal.removeEventListener("abort", on_abort);
    void run_effect(Fiber.interrupt(fiber)).catch(() => undefined);
  };
};
