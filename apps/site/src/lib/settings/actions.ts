import { Effect, Option } from "effect";
import { encode } from "uqr";
import { CoreApi } from "@artisanstreet/core-client";
import type { Kind, Snapshot } from "./model.ts";

export const load_snapshot = Effect.gen(function* () {
  const api = yield* CoreApi;
  const snapshot: Snapshot = yield* Effect.all(
    {
      me: api.me,
      methods: api.sign_in_methods,
      sessions: api.sessions.pipe(Effect.map((list) => list.sessions)),
      deletion: api.deletion_status,
    },
    { concurrency: "unbounded" },
  );
  return snapshot;
});

export interface Enrollment {
  readonly otpauth_url: string;
  readonly recovery_codes: ReadonlyArray<string>;
  readonly qr: ReadonlyArray<ReadonlyArray<boolean>>;
}

export const start_enrollment = Effect.gen(function* () {
  const api = yield* CoreApi;
  const started = yield* api.enroll_totp;
  const enrollment: Enrollment = {
    otpauth_url: started.otpauth_url,
    recovery_codes: started.recovery_codes,
    qr: encode(started.otpauth_url, { border: 0 }).data,
  };
  return enrollment;
});

const code_of = (raw: string): Option.Option<string> => Option.some(raw.trim()).pipe(Option.filter((code) => code !== ""));

export const confirm_enrollment = (code: string) =>
  Effect.gen(function* () {
    const api = yield* CoreApi;
    yield* api.verify_totp(code.trim());
  });

export const turn_off_totp = (code: string) =>
  Effect.gen(function* () {
    const api = yield* CoreApi;
    yield* api.disable_totp(code.trim());
  });

export const remove_method = (kind: Kind, code: string) =>
  Effect.gen(function* () {
    const api = yield* CoreApi;
    yield* api.remove_sign_in(kind, code_of(code));
  });

export const enable_email = Effect.gen(function* () {
  const api = yield* CoreApi;
  yield* api.enable_email_sign_in;
});

export const request_deletion = (code: string) =>
  Effect.gen(function* () {
    const api = yield* CoreApi;
    yield* api.request_deletion(code_of(code));
  });

export const cancel_deletion = Effect.gen(function* () {
  const api = yield* CoreApi;
  yield* api.cancel_deletion;
});

export const sign_out_everywhere = Effect.gen(function* () {
  const api = yield* CoreApi;
  yield* api.revoke_all_sessions;
});

export const revoke_session = (session_id: string) => Effect.gen(function* () {
  const api = yield* CoreApi;
  yield* api.revoke_session(session_id);
});
