import { Schema } from "effect";

const ulid = "[0-9A-HJKMNP-TV-Z]{26}";

const prefixed_id = (prefix: string) =>
  Schema.String.check(Schema.isPattern(new RegExp(`^${prefix}_${ulid}$`)));

export const LoginRequestId = prefixed_id("logreq");
export const AccountId = prefixed_id("acct");
export const SessionId = prefixed_id("sess");

export const Email = Schema.String.check(Schema.isPattern(/^[^@\s]+@[^@\s]+\.[^@\s]+$/));

export const LoginStatus = Schema.Literals(["pending", "email_approved", "completed", "expired"]);

export const MagicRequest = Schema.Struct({
  email: Email,
  displayName: Schema.optionalKey(Schema.String),
  deviceName: Schema.optionalKey(Schema.String),
});

export const MagicRequestResp = Schema.Struct({
  request_id: LoginRequestId,
  request_secret: Schema.String,
  expires_at: Schema.String,
});

export const MagicStatusReq = Schema.Struct({
  requestId: LoginRequestId,
  requestSecret: Schema.String,
});

export const MagicStatusResp = Schema.Struct({
  request_id: LoginRequestId,
  status: LoginStatus,
  totp_required: Schema.Boolean,
  email: Email,
  expires_at: Schema.String,
});

export const MagicConsumeReq = Schema.Struct({
  token: Schema.String,
});

export const MagicConsumeResp = Schema.Struct({
  request_id: LoginRequestId,
  status: LoginStatus,
  totp_required: Schema.Boolean,
});

export const MagicFinalizeReq = Schema.Struct({
  requestId: LoginRequestId,
  requestSecret: Schema.String,
  totpCode: Schema.optionalKey(Schema.String),
  recoveryCode: Schema.optionalKey(Schema.String),
});

export const MagicFinalizeResp = Schema.Struct({
  session_id: SessionId,
  account_id: AccountId,
  expires_at: Schema.String,
  totp_verified: Schema.Boolean,
});

export const MeResp = Schema.Struct({
  account_id: AccountId,
  email: Email,
});

export const ErrorEnvelope = Schema.Struct({
  error: Schema.Struct({
    code: Schema.String,
    message: Schema.String,
    request_id: Schema.optionalKey(Schema.String),
  }),
});

export type MagicRequestResp = typeof MagicRequestResp.Type;
export type MagicStatusResp = typeof MagicStatusResp.Type;
export type MagicConsumeResp = typeof MagicConsumeResp.Type;
export type MagicFinalizeReq = typeof MagicFinalizeReq.Type;
export type MagicFinalizeResp = typeof MagicFinalizeResp.Type;
export type MeResp = typeof MeResp.Type;
export type LoginStatus = typeof LoginStatus.Type;
