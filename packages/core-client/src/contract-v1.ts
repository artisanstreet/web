import { Schema } from "effect";

const ulid = "[0-9A-HJKMNP-TV-Z]{26}";

const prefixed_id = (prefix: string) =>
  Schema.String.check(Schema.isPattern(new RegExp(`^${prefix}_${ulid}$`)));

const bounded = (min: number, max: number) => Schema.String.check(Schema.isMinLength(min), Schema.isMaxLength(max));

const at_most = (max: number) => Schema.String.check(Schema.isMaxLength(max));

export const AccountId = prefixed_id("acct");
export const OauthFlowId = prefixed_id("oflow");
export const SessionId = prefixed_id("sess");
export const MachineId = prefixed_id("mch");
export const EnrollmentId = prefixed_id("enr");
export const LoginRequestId = prefixed_id("logreq");
export const ConnectionId = prefixed_id("conn");
export const ArtifactId = prefixed_id("art");
export const BundleId = prefixed_id("bundle");
export const TokenId = prefixed_id("tkn");
export const EventId = prefixed_id("evt");

export const Rfc3339 = Schema.String.check(
  Schema.makeFilter((input: string) => !Number.isNaN(Date.parse(input)) || "expected RFC 3339 timestamp"),
);

export const Base64url = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]+$/));

export const Base64url32 = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{43}$/));

export const Sha256Hex = Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/));

export const Email = Schema.String.check(Schema.isPattern(/^[^@\s]+@[^@\s]+\.[^@\s]+$/));

export const JwkOkp = Schema.Struct({
  kty: Schema.Literal("OKP"),
  crv: Schema.Literal("Ed25519"),
  x: Base64url32,
});

export const ErrorEnvelope = Schema.Struct({
  error: Schema.Struct({
    code: Schema.String,
    message: Schema.String,
    request_id: Schema.optionalKey(Schema.String),
  }),
});

export const Revoked = Schema.Struct({ revoked: Schema.Boolean });

export const Unassigned = Schema.Struct({ unassigned: Schema.Boolean });

export const GrantScope = Schema.Literals(["relay:connect", "forge:execute", "machine:sync"]);

export const GrantAudience = Schema.Literals(["ast-relay", "ast-core"]);

export const GrantClaims = Schema.Struct({
  v: Schema.Literal(1),
  iss: Schema.String,
  aud: GrantAudience,
  sub: AccountId,
  mid: MachineId,
  role: Schema.Literals(["client", "forge"]),
  cnf: Schema.Struct({ jwk: JwkOkp }),
  scope: Schema.NonEmptyArray(GrantScope),
  iat: Schema.Number,
  nbf: Schema.Number,
  exp: Schema.Number,
  jti: TokenId,
});

export const LoginStatus = Schema.Literals(["pending", "email_approved", "completed", "expired"]);

export const MagicRequest = Schema.Struct({
  email: Email,
  displayName: Schema.optionalKey(Schema.String),
  deviceName: Schema.optionalKey(Schema.String),
});

export const MagicRequestResp = Schema.Struct({
  request_id: LoginRequestId,
  request_secret: Schema.String,
  expires_at: Rfc3339,
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
  expires_at: Rfc3339,
});

export const MagicConsumeReq = Schema.Struct({
  token: Schema.String,
  requestSecret: Schema.optionalKey(Schema.String),
});

export const MagicConsumeResp = Schema.Struct({
  request_id: LoginRequestId,
  status: LoginStatus,
  totp_required: Schema.Boolean,
});

export const MagicConfirmResp = Schema.Struct({
  status: Schema.Literal("confirmation_required"),
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
  expires_at: Rfc3339,
  totp_verified: Schema.Boolean,
});

export const TotpEnrollResp = Schema.Struct({
  otpauth_url: Schema.String,
  recovery_codes: Schema.Array(Schema.String),
});

export const TotpVerifyReq = Schema.Struct({ code: Schema.String });

export const TotpVerifyResp = Schema.Struct({ enrolled: Schema.Boolean });

export const TotpDisableReq = Schema.Struct({ code: Schema.String });

export const TotpDisableResp = Schema.Struct({ disabled: Schema.Boolean });

export const SessionInfo = Schema.Struct({
  id: SessionId,
  is_current: Schema.optional(Schema.Boolean),
  device_name: Schema.String,
  browser: Schema.optional(Schema.NullOr(Schema.String)),
  device: Schema.optional(Schema.NullOr(Schema.String)),
  country_code: Schema.optional(Schema.NullOr(Schema.String)),
  last_seen_at: Schema.optional(Schema.NullOr(Rfc3339)),
  totp_verified_at: Schema.NullOr(Rfc3339),
  created_at: Rfc3339,
  expires_at: Rfc3339,
  revoked_at: Schema.NullOr(Rfc3339),
});

export const SessionListResp = Schema.Struct({ sessions: Schema.Array(SessionInfo) });

export const MeMachine = Schema.Struct({
  id: MachineId,
  public_key: JwkOkp,
  label: Schema.String,
  created_at: Rfc3339,
  revoked_at: Schema.NullOr(Rfc3339),
});

export const MeProvider = Schema.Struct({
  id: ConnectionId,
  provider: Schema.String,
  label: Schema.String,
  revoked_at: Schema.NullOr(Rfc3339),
  assigned_machine_ids: Schema.Array(MachineId),
});

export const SignedInAccount = Schema.Struct({
  account_id: AccountId,
  email: Email,
  display_name: Schema.String,
  avatar_url: Schema.NullOr(Schema.String),
});

export const SignedInAccountsResp = Schema.Struct({ accounts: Schema.Array(SignedInAccount) });

export const ProfileResp = Schema.Struct({ display_name: Schema.String, username: Schema.NullOr(Schema.String), avatar_url: Schema.NullOr(Schema.String), phone: Schema.NullOr(Schema.String) });
export const ProfilePhoneReq = Schema.Struct({ phone: Schema.NullOr(Schema.String.check(Schema.isPattern(/^\+[1-9][0-9]{7,14}$/))) });
export const ProfileNameReq = Schema.Struct({ displayName: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(120)) });
export const ProfileUsernameReq = Schema.Struct({ username: Schema.String.check(Schema.isPattern(/^[a-z0-9][a-z0-9_-]{0,31}$/)) });
export const ProfileAvatarReq = Schema.Struct({ avatar: Schema.String.check(Schema.isMaxLength(350000)) });

export const MeResp = Schema.Struct({
  account_id: AccountId,
  email: Email,
  display_name: Schema.String,
  avatar_url: Schema.NullOr(Schema.String),
  totp_enrolled: Schema.Boolean,
  machines: Schema.Array(MeMachine),
  provider_connections: Schema.Array(MeProvider),
  latest_config_version: Schema.NullOr(Schema.Number),
});

export const EnrollmentStartReq = Schema.Struct({
  publicKey: JwkOkp,
  label: Schema.String,
  timestamp: Schema.Number,
  proof: Base64url,
});

export const EnrollmentStartResp = Schema.Struct({
  enrollment_id: EnrollmentId,
  code: Schema.String,
  expires_at: Rfc3339,
  key_fingerprint: Base64url,
});

export const EnrollmentClaimReq = Schema.Struct({ code: Schema.String });

export const EnrollmentClaimResp = Schema.Struct({
  enrollment_id: EnrollmentId,
  status: Schema.Literal("claimed"),
});

export const EnrollmentStatusResp = Schema.Struct({
  enrollment_id: EnrollmentId,
  status: Schema.Literals(["pending", "claimed", "confirmed", "expired", "voided"]),
  account_id: Schema.NullOr(AccountId),
  email: Schema.NullOr(Email),
  display_name: Schema.NullOr(Schema.String),
  expires_at: Rfc3339,
});

export const EnrollmentConfirmReq = Schema.Struct({
  enrollmentId: EnrollmentId,
  accountId: AccountId,
  confirmation: Base64url,
});

export const EnrollmentConfirmResp = Schema.Struct({
  machine_id: MachineId,
  account_id: AccountId,
});

export const MachineInfo = Schema.Struct({
  id: MachineId,
  public_key: JwkOkp,
  label: Schema.String,
  created_at: Rfc3339,
  revoked_at: Schema.NullOr(Rfc3339),
  last_seen_at: Schema.NullOr(Rfc3339),
});

export const MachineListResp = Schema.Struct({ machines: Schema.Array(MachineInfo) });

export const GrantIssueReq = Schema.Struct({
  audience: GrantAudience,
  scope: Schema.NonEmptyArray(GrantScope),
  ttlSeconds: Schema.optionalKey(Schema.Number),
  targetMachineId: Schema.optionalKey(MachineId),
  cnf: Schema.optionalKey(JwkOkp),
});

export const GrantIssueResp = Schema.Struct({
  token: Schema.String,
  expires_at: Rfc3339,
});

export const JwksResp = Schema.Struct({
  keys: Schema.Array(
    Schema.Struct({
      kty: Schema.Literal("OKP"),
      crv: Schema.Literal("Ed25519"),
      x: Base64url32,
      kid: Schema.String,
      use: Schema.Literal("sig"),
      alg: Schema.Literal("EdDSA"),
    }),
  ),
});

export const RevocationsResp = Schema.Struct({
  revoked_machine_ids: Schema.Array(MachineId),
  revoked_key_ids: Schema.Array(Schema.String),
  as_of: Rfc3339,
});

export const ProviderKind = Schema.Literals(["anthropic", "openai", "openrouter", "google"]);

export const ProviderCreateReq = Schema.Struct({
  provider: ProviderKind,
  label: Schema.optionalKey(Schema.String),
  apiKey: Schema.String,
});

export const ProviderInfo = Schema.Struct({
  id: ConnectionId,
  provider: ProviderKind,
  label: Schema.String,
  created_at: Rfc3339,
  revoked_at: Schema.NullOr(Rfc3339),
  assigned_machine_ids: Schema.Array(MachineId),
});

export const ProviderListResp = Schema.Struct({ connections: Schema.Array(ProviderInfo) });

export const AssignReq = Schema.Struct({
  connectionId: ConnectionId,
  machineId: MachineId,
});

export const AssignResp = Schema.Struct({
  connection_id: ConnectionId,
  machine_id: MachineId,
});

export const ArtifactAssignReq = Schema.Struct({
  artifactId: ArtifactId,
  machineId: MachineId,
});

export const ArtifactAssignResp = Schema.Struct({
  artifact_id: ArtifactId,
  machine_id: MachineId,
});

export const CredentialResp = Schema.Struct({
  provider: ProviderKind,
  secret: Schema.String,
});

export const EngineKind = Schema.Literals(["claude", "codex", "opencode"]);

export const ArtifactKind = Schema.Literals(["oauth", "api_key"]);

export const FileMode = Schema.Literals(["0600", "0400"]);

export const ArtifactFile = Schema.Struct({
  path: Schema.String,
  mode: FileMode,
  sha256: Sha256Hex,
  contentBase64: Base64url,
});

export const ArtifactFileResp = Schema.Struct({
  path: Schema.String,
  mode: FileMode,
  sha256: Sha256Hex,
  content_base64: Base64url,
});

export const EngineArtifactEnvelope = Schema.Struct({
  format: Schema.Literal("ast-engine-credential/1"),
  engine: EngineKind,
  kind: ArtifactKind,
  exportedAt: Rfc3339,
  expiresAt: Schema.NullOr(Rfc3339),
  files: Schema.NonEmptyArray(ArtifactFile),
  note: Schema.optionalKey(Schema.String),
});

export const EngineArtifactEnvelopeResp = Schema.Struct({
  format: Schema.Literal("ast-engine-credential/1"),
  engine: EngineKind,
  kind: ArtifactKind,
  exported_at: Rfc3339,
  expires_at: Schema.NullOr(Rfc3339),
  files: Schema.NonEmptyArray(ArtifactFileResp),
  note: Schema.optionalKey(Schema.String),
});

export const ArtifactCreateReq = Schema.Struct({
  label: Schema.optionalKey(Schema.String),
  envelope: EngineArtifactEnvelope,
});

export const ArtifactCreateResp = Schema.Struct({ id: ArtifactId });

export const ArtifactInfo = Schema.Struct({
  id: ArtifactId,
  engine: EngineKind,
  kind: ArtifactKind,
  label: Schema.String,
  format_version: Schema.String,
  exported_at: Rfc3339,
  created_at: Rfc3339,
  revoked_at: Schema.NullOr(Rfc3339),
  assigned_machine_ids: Schema.Array(MachineId),
});

export const ArtifactListResp = Schema.Struct({ artifacts: Schema.Array(ArtifactInfo) });

export const ArtifactDownloadResp = Schema.Struct({ envelope: EngineArtifactEnvelopeResp });

export const McpServer = Schema.Struct({
  name: bounded(1, 120),
  command: Schema.optionalKey(at_most(500)),
  args: Schema.optionalKey(Schema.Array(at_most(500))),
  url: Schema.optionalKey(at_most(2000)),
});

export const SkillFile = Schema.Struct({
  path: bounded(1, 256),
  contentBase64: Base64url,
  sha256: Sha256Hex,
});

export const SkillFileResp = Schema.Struct({
  path: bounded(1, 256),
  content_base64: Base64url,
  sha256: Sha256Hex,
});

const skill_files = <F extends Schema.Top>(file: F) =>
  Schema.Struct({ files: Schema.Array(file).check(Schema.isMinLength(1), Schema.isMaxLength(64)) });

export const SkillRef = Schema.Struct({
  name: bounded(1, 120),
  source: bounded(1, 2000),
  version: Schema.optionalKey(at_most(60)),
  bundle: Schema.optionalKey(skill_files(SkillFile)),
});

export const SkillRefResp = Schema.Struct({
  name: bounded(1, 120),
  source: bounded(1, 2000),
  version: Schema.optionalKey(at_most(60)),
  bundle: Schema.optionalKey(skill_files(SkillFileResp)),
});

export const EditorManifest = Schema.Struct({
  format: Schema.Literal("ast-editor-config/1"),
  mcpServers: Schema.Array(McpServer),
  skills: Schema.Array(SkillRef),
  globalPrompt: Schema.optionalKey(Schema.String),
});

export const EditorManifestResp = Schema.Struct({
  format: Schema.Literal("ast-editor-config/1"),
  mcp_servers: Schema.Array(McpServer),
  skills: Schema.Array(SkillRefResp),
  global_prompt: Schema.optionalKey(Schema.String),
});

export const BundlePublishReq = Schema.Struct({ manifest: EditorManifest });

export const BundleInfo = Schema.Struct({
  id: BundleId,
  version: Schema.Number,
  content_hash: Sha256Hex,
  r2_key: Schema.String,
  created_at: Rfc3339,
});

export const BundleLatestResp = Schema.Struct({
  bundle: Schema.NullOr(BundleInfo),
  manifest: Schema.NullOr(EditorManifestResp),
});

export const ConfigStatus = Schema.Literals(["applied", "failed"]);

export const ConfigStateReq = Schema.Struct({
  bundleId: BundleId,
  status: ConfigStatus,
  detail: Schema.optionalKey(Schema.String),
});

export const ConfigStateResp = Schema.Struct({
  machine_id: MachineId,
  bundle_id: BundleId,
  status: ConfigStatus,
  applied_at: Rfc3339,
});

export const ActivityEvent = Schema.Struct({
  id: EventId,
  machine_id: Schema.NullOr(MachineId),
  kind: Schema.String,
  detail: Schema.Unknown,
  ip: Schema.NullOr(Schema.String),
  created_at: Rfc3339,
});

export const ActivityResp = Schema.Struct({ events: Schema.Array(ActivityEvent) });

export const DeletionRequestReq = Schema.Struct({
  totpCode: Schema.optionalKey(Schema.String),
});

export const DeletionStatusResp = Schema.Struct({
  status: Schema.Literals(["none", "pending", "cancelled", "done"]),
  requested_at: Schema.NullOr(Rfc3339),
  purge_after: Schema.NullOr(Rfc3339),
  completed_at: Schema.NullOr(Rfc3339),
});

export const SignInKind = Schema.Literals(["email", "google", "github"]);
export const OauthProvider = Schema.Literals(["google", "github"]);

export const OauthStartReq = Schema.Struct({ provider: OauthProvider });

export const OauthStartResp = Schema.Struct({
  flow_id: OauthFlowId,
  flow_secret: Base64url,
  authorize_url: Schema.String,
  expires_at: Rfc3339,
});

export const OauthCallbackReq = Schema.Struct({
  flowId: OauthFlowId,
  flowSecret: Base64url,
  state: Base64url,
  code: bounded(1, 2048),
});

export const OauthCallbackResp = Schema.Union([
  Schema.Struct({
    outcome: Schema.Literal("signed_in"),
    session_id: SessionId,
    account_id: AccountId,
    expires_at: Rfc3339,
    totp_verified: Schema.Boolean,
  }),
  Schema.Struct({ outcome: Schema.Literal("second_factor_required") }),
  Schema.Struct({
    outcome: Schema.Literal("signup_required"),
    email: Email,
    display_name: Schema.String,
    avatar_url: Schema.NullOr(Schema.String),
  }),
  Schema.Struct({ outcome: Schema.Literal("linked"), provider: OauthProvider }),
  Schema.Struct({ outcome: Schema.Literal("linked_elsewhere") }),
  Schema.Struct({ outcome: Schema.Literal("email_taken"), email: Email }),
  Schema.Struct({ outcome: Schema.Literal("no_verified_email") }),
]);

export const OauthSecondFactorReq = Schema.Struct({
  flowId: OauthFlowId,
  flowSecret: Base64url,
  totpCode: Schema.optionalKey(Schema.String),
  recoveryCode: Schema.optionalKey(Schema.String),
});

export const OauthSignupReq = Schema.Struct({
  flowId: OauthFlowId,
  flowSecret: Base64url,
  displayName: at_most(120),
});

export const SignInMethod = Schema.Struct({ kind: SignInKind, created_at: Rfc3339 });

export const SignInMethodsResp = Schema.Struct({ email: Email, methods: Schema.Array(SignInMethod) });

export const SignInMethodRemoveReq = Schema.Struct({
  totpCode: Schema.optionalKey(Schema.String),
});

export const VersionResp = Schema.Struct({
  api: Schema.String,
  contracts: Schema.String,
  jwks_uri: Schema.String,
  openapi: Schema.String,
});

export type AccountId = typeof AccountId.Type;
export type MachineId = typeof MachineId.Type;
export type JwkOkp = typeof JwkOkp.Type;
export type GrantScope = typeof GrantScope.Type;
export type GrantClaims = typeof GrantClaims.Type;
export type LoginStatus = typeof LoginStatus.Type;
export type MagicRequestResp = typeof MagicRequestResp.Type;
export type MagicStatusResp = typeof MagicStatusResp.Type;
export type MagicConsumeResp = typeof MagicConsumeResp.Type;
export type MagicFinalizeReq = typeof MagicFinalizeReq.Type;
export type MagicFinalizeResp = typeof MagicFinalizeResp.Type;
export type TotpEnrollResp = typeof TotpEnrollResp.Type;
export type SessionInfo = typeof SessionInfo.Type;
export type ProfileResp = typeof ProfileResp.Type;
export type SessionListResp = typeof SessionListResp.Type;
export type MeResp = typeof MeResp.Type;
export type SignedInAccount = typeof SignedInAccount.Type;
export type MachineInfo = typeof MachineInfo.Type;
export type MachineListResp = typeof MachineListResp.Type;
export type GrantIssueReq = typeof GrantIssueReq.Type;
export type GrantIssueResp = typeof GrantIssueResp.Type;
export type JwksResp = typeof JwksResp.Type;
export type ProviderKind = typeof ProviderKind.Type;
export type ProviderInfo = typeof ProviderInfo.Type;
export type ProviderListResp = typeof ProviderListResp.Type;
export type ArtifactFile = typeof ArtifactFile.Type;
export type ArtifactFileResp = typeof ArtifactFileResp.Type;
export type EngineArtifactEnvelope = typeof EngineArtifactEnvelope.Type;
export type EngineArtifactEnvelopeResp = typeof EngineArtifactEnvelopeResp.Type;
export type ArtifactInfo = typeof ArtifactInfo.Type;
export type ArtifactListResp = typeof ArtifactListResp.Type;
export type SkillFile = typeof SkillFile.Type;
export type SkillFileResp = typeof SkillFileResp.Type;
export type EditorManifest = typeof EditorManifest.Type;
export type EditorManifestResp = typeof EditorManifestResp.Type;
export type BundleInfo = typeof BundleInfo.Type;
export type BundleLatestResp = typeof BundleLatestResp.Type;
export type ConfigStateResp = typeof ConfigStateResp.Type;
export type ActivityEvent = typeof ActivityEvent.Type;
export type ActivityResp = typeof ActivityResp.Type;
export type DeletionStatusResp = typeof DeletionStatusResp.Type;
export type VersionResp = typeof VersionResp.Type;
export type SignInKind = typeof SignInKind.Type;
export type OauthProvider = typeof OauthProvider.Type;
export type OauthStartResp = typeof OauthStartResp.Type;
export type OauthCallbackResp = typeof OauthCallbackResp.Type;
export type SignInMethodsResp = typeof SignInMethodsResp.Type;
