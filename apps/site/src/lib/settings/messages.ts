import { Match } from "effect";
import type { CoreFailure } from "@artisanstreet/core-client";

export const friendly_error = (failure: CoreFailure): string =>
  Match.valueTags(failure, {
    ApiFailure: ({ status, message }) =>
      Match.value(status).pipe(
        Match.when(403, () => "That code didn't work. Check your authenticator and try again."),
        Match.when(429, () => "That was a lot of attempts. Wait a minute, then try again."),
        Match.when((code) => code >= 500, () => "Our account service hit an error on its side. Try again in a moment."),
        Match.orElse(() => message),
      ),
    TransportFailure: () => "We couldn't reach the account service. Check your connection and try again.",
    DecodeFailure: () => "The account service answered with something we couldn't read. Try again in a moment.",
    InvalidRequest: () => "We couldn't put that request together. Reload the page and try again.",
  });
