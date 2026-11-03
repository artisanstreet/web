import { Match } from "effect";
import type { CoreFailure, InvalidEmail } from "@artisanstreet/core-client";
import type { FinalizeFailure, RequestLost } from "./state.ts";

export type SignInFailure = CoreFailure | InvalidEmail | FinalizeFailure | RequestLost;

export const friendly_error = (failure: SignInFailure): string =>
  Match.valueTags(failure, {
    ApiFailure: ({ status, message }) =>
      Match.value(status).pipe(
        Match.when(429, () => "Easy there, that was a lot of attempts. Wait a minute, then try again."),
        Match.when((code) => code >= 500, () => "Our account service hit an error on its side. Try again in a moment."),
        Match.orElse(() => message),
      ),
    TransportFailure: () => "We couldn't reach the account service. Check your connection and try again.",
    DecodeFailure: () => "The account service answered with something we couldn't read. Try again in a moment.",
    InvalidRequest: () => "We couldn't put that request together. Reload the page and try again.",
    InvalidEmail: () => "That doesn't look like an email address. Check for typos and try again.",
    FinalizeExpired: () => "This sign-in request timed out. Start again to get a fresh link.",
    FinalizeNotApproved: () => "The emailed link hasn't been approved yet. Open it from your inbox first.",
    FinalizeMissingSecret: () =>
      "This browser didn't start the sign-in, so it can't finish it. Finish on the browser you requested the link from.",
    FinalizeTotpRequired: () => "This account needs a second factor. Enter your authenticator code or a recovery code.",
    RequestLost: () => "This browser lost track of the sign-in request. Start again.",
  });
