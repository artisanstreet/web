// Login state machine: idle → requested → pending → email_approved →
// completed | expired. Guards mirror core/web/src/auth.ts so finalize never
// fires without the originating secret or before approval, and TOTP cannot
// be skipped when enrolled.

import { Data, Effect, Either, Match } from "effect";

export type LoginPhase = "idle" | "requested" | "pending" | "email_approved" | "completed" | "expired";

export interface LoginState {
  readonly request_id: string;
  readonly email: string;
  readonly expires_at: string;
  readonly phase: LoginPhase;
  readonly totp_required: boolean;
}

export const next_login_state = (
  current: LoginState,
  status: {
    status: "pending" | "email_approved" | "completed" | "expired";
    totp_required: boolean;
    email: string;
    expires_at: string;
  },
): LoginState => ({
  ...current,
  phase: status.status,
  totp_required: status.totp_required,
  email: status.email,
  expires_at: status.expires_at,
});

export class FinalizeNotApproved extends Data.TaggedError("FinalizeNotApproved")<{
  readonly phase: LoginPhase;
}> {}

export class FinalizeExpired extends Data.TaggedError("FinalizeExpired") {}

export class FinalizeMissingSecret extends Data.TaggedError("FinalizeMissingSecret") {}

export class FinalizeTotpRequired extends Data.TaggedError("FinalizeTotpRequired") {}

export type FinalizeFailure =
  | FinalizeNotApproved
  | FinalizeExpired
  | FinalizeMissingSecret
  | FinalizeTotpRequired;

export interface FinalizePayload {
  readonly request_id: string;
  readonly request_secret: string;
  readonly totp_code?: string;
  readonly recovery_code?: string;
}

const check_finalize = (args: {
  state: LoginState;
  opts: { request_secret: string | null; totp_code?: string; recovery_code?: string };
}): Either.Either<FinalizePayload, FinalizeFailure> => {
  const { state, opts } = args;
  if (state.phase === "expired") {
    return Either.left(new FinalizeExpired());
  }
  if (state.phase !== "email_approved") {
    return Either.left(new FinalizeNotApproved({ phase: state.phase }));
  }
  if (!opts.request_secret) {
    return Either.left(new FinalizeMissingSecret());
  }
  if (state.totp_required && !opts.totp_code && !opts.recovery_code) {
    return Either.left(new FinalizeTotpRequired());
  }
  const payload: FinalizePayload = {
    request_id: state.request_id,
    request_secret: opts.request_secret,
  };
  return Either.right({
    ...payload,
    ...(opts.totp_code ? { totp_code: opts.totp_code } : {}),
    ...(opts.recovery_code ? { recovery_code: opts.recovery_code } : {}),
  });
};

export const finalize_failure_message = (failure: FinalizeFailure): string =>
  Match.value(failure).pipe(
    Match.tag("FinalizeExpired", () => "This sign-in request expired. Start over."),
    Match.tag("FinalizeNotApproved", () => "The emailed link has not been approved yet. Approve it first."),
    Match.tag(
      "FinalizeMissingSecret",
      () =>
        "This browser did not start the sign-in, so it cannot finish it. " +
        "Finish on the browser that requested the link.",
    ),
    Match.tag("FinalizeTotpRequired", () => "This account needs its authenticator code (or a recovery code)."),
    Match.exhaustive,
  );

export const validate_finalize = (args: {
  state: LoginState;
  opts: { request_secret: string | null; totp_code?: string; recovery_code?: string };
}): Either.Either<FinalizePayload, FinalizeFailure> => check_finalize(args);

export const finalize_effect = (args: {
  state: LoginState;
  opts: { request_secret: string | null; totp_code?: string; recovery_code?: string };
}): Effect.Effect<FinalizePayload, FinalizeFailure> =>
  Effect.gen(function* () {
    return yield* validate_finalize(args);
  });
