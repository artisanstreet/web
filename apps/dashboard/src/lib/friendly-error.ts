import { Match } from "effect";
import { ApiError } from "@artisanstreet/core-client";

// Product error copy: field-level and human, never Effect internals.
// Server errors stay generic with typed request_id; accessible forms surface
// this string via role=status. No secrets, no tokens in messages.
export const friendly_error = (err: unknown): string => {
  return Match.value(err).pipe(
    Match.when(
      (v: unknown): v is ApiError => v instanceof ApiError && v.status === 401,
      () => "Your session expired. Sign in again.",
    ),
    Match.when(
      (v: unknown): v is ApiError =>
        v instanceof ApiError &&
        (v.status === 0 || v.code === "bad_response" || v.code === "transport_error"),
      () => "Could not load your account. Try again.",
    ),
    Match.when(
      (v: unknown): v is ApiError => v instanceof ApiError && v.status === 429,
      () => "Too many attempts. Wait a little and try again.",
    ),
    Match.when(
      (v: unknown): v is ApiError => v instanceof ApiError && v.status >= 500,
      (api_err) =>
        api_err.request_id
          ? `The account service had a problem (ref ${api_err.request_id}). Try again.`
          : "The account service had a problem. Try again in a bit.",
    ),
    Match.when(
      (v: unknown): v is ApiError => v instanceof ApiError,
      (api_err) =>
        api_err.request_id ? `${api_err.message} (ref ${api_err.request_id})` : api_err.message,
    ),
    Match.when(
      (v: unknown): v is Error => v instanceof Error,
      (e) => e.message,
    ),
    Match.orElse(() => "Something went wrong."),
  );
};
