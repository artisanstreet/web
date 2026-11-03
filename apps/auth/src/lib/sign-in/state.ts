import { Data, Effect, Match, Option } from "effect";
import { SecondFactor, type FinalizePayload, type LoginStatus } from "@artisanstreet/core-client";

export interface LoginState {
  readonly request_id: string;
  readonly email: string;
  readonly expires_at: string;
  readonly phase: LoginStatus;
  readonly totp_required: boolean;
}

export class FinalizeExpired extends Data.TaggedError("FinalizeExpired") {}

export class FinalizeNotApproved extends Data.TaggedError("FinalizeNotApproved")<{
  readonly phase: LoginStatus;
}> {}

export class FinalizeMissingSecret extends Data.TaggedError("FinalizeMissingSecret") {}

export class FinalizeTotpRequired extends Data.TaggedError("FinalizeTotpRequired") {}

export class RequestLost extends Data.TaggedError("RequestLost") {}

export type FinalizeFailure =
  | FinalizeExpired
  | FinalizeNotApproved
  | FinalizeMissingSecret
  | FinalizeTotpRequired;

export const second_factor = (use_recovery: boolean, input: string): SecondFactor => {
  const code = input.trim();
  return Match.value({ code, use_recovery }).pipe(
    Match.when({ code: "" }, () => SecondFactor.None()),
    Match.when({ use_recovery: true }, () => SecondFactor.Recovery({ code })),
    Match.orElse(() => SecondFactor.Totp({ code })),
  );
};

export const finalize_payload = (
  login: LoginState,
  factor: SecondFactor,
  secret: Option.Option<string>,
): Effect.Effect<FinalizePayload, FinalizeFailure> =>
  Match.value(login.phase).pipe(
    Match.when("expired", () => Effect.fail(new FinalizeExpired())),
    Match.when("email_approved", () =>
      Option.match(secret, {
        onNone: () => Effect.fail(new FinalizeMissingSecret()),
        onSome: (request_secret) =>
          login.totp_required && SecondFactor.$is("None")(factor)
            ? Effect.fail(new FinalizeTotpRequired())
            : Effect.succeed({ request_id: login.request_id, request_secret, factor }),
      }),
    ),
    Match.orElse((phase) => Effect.fail(new FinalizeNotApproved({ phase }))),
  );
