// Product error copy: field-level and human, never Effect internals.
// API errors stay generic (code + safe message + request_id logged safely,
// never the request secret).

import { Match } from "effect";
import { ApiError } from "@artisanstreet/core-client";
import {
  FinalizeExpired,
  FinalizeMissingSecret,
  FinalizeNotApproved,
  FinalizeTotpRequired,
  finalize_failure_message,
} from "./auth/state.ts";

export const friendly_error = (err: unknown): string => {
  if (
    err instanceof FinalizeExpired ||
    err instanceof FinalizeMissingSecret ||
    err instanceof FinalizeNotApproved ||
    err instanceof FinalizeTotpRequired
  ) {
    return finalize_failure_message(err);
  }
  return Match.value(err).pipe(
    Match.when(
      (v: unknown): v is ApiError => v instanceof ApiError && v.status === 429,
      () => "Too many attempts. Wait a little and try again.",
    ),
    Match.when(
      (v: unknown): v is ApiError => v instanceof ApiError && v.status >= 500,
      () => "The account service had a problem. Try again in a bit.",
    ),
    Match.when(
      (v: unknown): v is ApiError => v instanceof ApiError,
      (api_err) => api_err.message,
    ),
    Match.when(
      (v: unknown): v is Error => v instanceof Error,
      (e) => e.message,
    ),
    Match.orElse(() => "Something went wrong."),
  );
};

// Safe log line: request_id only, never the secret or token.
export const safe_request_log = (request_id: string): string => `auth request ${request_id}`;
