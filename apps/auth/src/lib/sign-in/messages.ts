import { Match } from "effect";
import type { CoreFailure, InvalidEmail } from "../core/errors.ts";
import type { FinalizeFailure, RequestLost } from "./state.ts";

export type SignInFailure = CoreFailure | InvalidEmail | FinalizeFailure | RequestLost;

export const friendly_error = (failure: SignInFailure): string =>
  Match.valueTags(failure, {
    ApiFailure: ({ status, message }) =>
      Match.value(status).pipe(
        Match.when(429, () => "Too many attempts. Wait a little and try again."),
        Match.when((code) => code >= 500, () => "The account service had a problem. Try again in a bit."),
        Match.orElse(() => message),
      ),
    TransportFailure: () => "The account service is unreachable. Try again in a bit.",
    DecodeFailure: () => "The account service answered with an unreadable response.",
    InvalidEmail: () => "Enter a valid email address.",
    FinalizeExpired: () => "This sign-in request expired. Start over.",
    FinalizeNotApproved: () => "The emailed link has not been approved yet. Approve it first.",
    FinalizeMissingSecret: () =>
      "This browser did not start the sign-in, so it cannot finish it. Finish on the browser that requested the link.",
    FinalizeTotpRequired: () => "This account needs its authenticator code (or a recovery code).",
    RequestLost: () => "This browser lost track of the request. Start over.",
  });
