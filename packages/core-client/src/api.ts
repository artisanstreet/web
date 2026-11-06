import { Context, Effect, flow, Layer, Option, Schedule, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest, type HttpClientResponse } from "effect/http";
import * as C from "./contract-v1.ts";
import { ApiFailure, DecodeFailure, InvalidEmail, InvalidRequest, is_transient, TransportFailure, type CoreFailure } from "./errors.ts";
import { factor_fields, type FinalizePayload, type SecondFactor } from "./finalize.ts";

export interface OauthFlowRef {
  readonly flow_id: string;
  readonly flow_secret: string;
}

const strict = { onExcessProperty: "error" } as const;

const api_failure = (status: number, json: unknown): Effect.Effect<never, CoreFailure> =>
  Schema.decodeUnknownEffect(C.ErrorEnvelope)(json).pipe(
    Effect.match({
      onFailure: (): CoreFailure => new DecodeFailure({ reason: `status ${status}` }),
      onSuccess: ({ error }): CoreFailure =>
        new ApiFailure({
          status,
          code: error.code,
          message: error.message,
          request_id: error.request_id ?? "",
        }),
    }),
    Effect.flatMap((failure) => Effect.fail(failure)),
  );

const decode_response =
  <A>(schema: Schema.Codec<A, unknown>) =>
  (response: HttpClientResponse.HttpClientResponse): Effect.Effect<A, CoreFailure> =>
    response.json.pipe(
      Effect.mapError(() => new DecodeFailure({ reason: `unreadable body ${response.status}` })),
      Effect.flatMap((json) =>
        response.status >= 200 && response.status < 300
          ? Schema.decodeUnknownEffect(schema)(json).pipe(
              Effect.mapError(() => new DecodeFailure({ reason: "unreadable shape" })),
            )
          : api_failure(response.status, json),
      ),
    );

const malformed = () => new InvalidRequest({ reason: "malformed request" });

const transient_retry = <A, E, R>(call: Effect.Effect<A, E, R>) =>
  Effect.retry(call, { while: is_transient, times: 2, schedule: Schedule.exponential("200 millis") });

const account_header = "x-ast-account";

const as_account =
  (account: Option.Option<string>) =>
  (request: HttpClientRequest.HttpClientRequest): HttpClientRequest.HttpClientRequest =>
    Option.match(account, {
      onNone: () => request,
      onSome: (id) => HttpClientRequest.setHeader(request, account_header, id),
    });

const path_of = (prefix: string, id: string, suffix: string) => `${prefix}/${encodeURIComponent(id)}${suffix}`;

const make = (base: string, active_account: Effect.Effect<Option.Option<string>>) =>
  Effect.gen(function* () {
    const client = (yield* HttpClient.HttpClient).pipe(
      HttpClient.mapRequest(flow(HttpClientRequest.prependUrl(base), HttpClientRequest.acceptJson)),
      HttpClient.mapRequestEffect((request) =>
        Effect.map(active_account, (account) =>
          request.headers[account_header] === undefined ? as_account(account)(request) : request,
        ),
      ),
    );

    const execute = <A>(request: HttpClientRequest.HttpClientRequest, schema: Schema.Codec<A, unknown>) =>
      client.execute(request).pipe(
        Effect.mapError(() => new TransportFailure()),
        Effect.flatMap(decode_response(schema)),
      );

    const get = <A>(request: HttpClientRequest.HttpClientRequest, schema: Schema.Codec<A, unknown>) =>
      execute(request, schema).pipe(transient_retry);

    const post = <A, B, E>(
      path: string,
      request_schema: Schema.Codec<B, unknown>,
      body: B,
      response_schema: Schema.Codec<A, unknown>,
      invalid: () => E,
      decorate: (request: HttpClientRequest.HttpClientRequest) => HttpClientRequest.HttpClientRequest = (request) =>
        request,
    ) =>
      Schema.encodeUnknownEffect(request_schema, strict)(body).pipe(
        Effect.mapError(invalid),
        Effect.flatMap((encoded) =>
          execute(decorate(HttpClientRequest.post(path).pipe(HttpClientRequest.bodyJsonUnsafe(encoded))), response_schema),
        ),
      );

    const post_empty = <A>(path: string, response_schema: Schema.Codec<A, unknown>) =>
      execute(HttpClientRequest.post(path).pipe(HttpClientRequest.bodyJsonUnsafe({})), response_schema);

    return {
      profile: get(HttpClientRequest.get("/v1/account/profile"), C.ProfileResp),
      update_profile_name: (display_name: string) => post("/v1/account/profile/name", C.ProfileNameReq, { displayName: display_name }, C.ProfileResp, malformed),
      update_profile_username: (username: string) => post("/v1/account/profile/username", C.ProfileUsernameReq, { username }, C.ProfileResp, malformed),
      update_profile_phone: (phone: string | null) => post("/v1/account/profile/phone", C.ProfilePhoneReq, { phone }, C.ProfileResp, malformed),
      update_profile_avatar: (avatar: string) => post("/v1/account/profile/avatar", C.ProfileAvatarReq, { avatar }, C.ProfileResp, malformed),
      request_magic_link: (email: string) =>
        post("/v1/auth/magic/request", C.MagicRequest, { email }, C.MagicRequestResp, () => new InvalidEmail()),
      login_status: (request_id: string, request_secret: string) =>
        post(
          "/v1/auth/magic/status",
          C.MagicStatusReq,
          { requestId: request_id, requestSecret: request_secret },
          C.MagicStatusResp,
          malformed,
        ),
      consume_magic_link: (token: string) =>
        post("/v1/auth/magic/consume", C.MagicConsumeReq, { token }, C.MagicConsumeResp, malformed),
      finalize_magic_link: (payload: FinalizePayload) =>
        post(
          "/v1/auth/magic/finalize",
          C.MagicFinalizeReq,
          {
            requestId: payload.request_id,
            requestSecret: payload.request_secret,
            ...factor_fields(payload.factor),
          },
          C.MagicFinalizeResp,
          malformed,
        ),
      start_oauth: (provider: C.OauthProvider) =>
        post("/v1/auth/oauth/start", C.OauthStartReq, { provider }, C.OauthStartResp, malformed),
      oauth_callback: (flow: OauthFlowRef, state: string, code: string) =>
        post(
          "/v1/auth/oauth/callback",
          C.OauthCallbackReq,
          { flowId: flow.flow_id, flowSecret: flow.flow_secret, state, code },
          C.OauthCallbackResp,
          malformed,
        ),
      oauth_second_factor: (flow: OauthFlowRef, factor: SecondFactor) =>
        post(
          "/v1/auth/oauth/second-factor",
          C.OauthSecondFactorReq,
          { flowId: flow.flow_id, flowSecret: flow.flow_secret, ...factor_fields(factor) },
          C.MagicFinalizeResp,
          malformed,
        ),
      oauth_signup: (flow: OauthFlowRef, display_name: string) =>
        post(
          "/v1/auth/oauth/signup",
          C.OauthSignupReq,
          { flowId: flow.flow_id, flowSecret: flow.flow_secret, displayName: display_name },
          C.MagicFinalizeResp,
          malformed,
        ),
      desktop_grant: (challenge: string) =>
        post("/v1/auth/desktop/grant", C.DesktopGrantReq, { challenge }, C.DesktopGrantResp, malformed),
      sign_in_methods: get(HttpClientRequest.get("/v1/account/sign-in-methods"), C.SignInMethodsResp),
      link_sign_in: (provider: C.OauthProvider, account: Option.Option<string>) =>
        post(
          "/v1/account/sign-in-methods/link",
          C.OauthStartReq,
          { provider },
          C.OauthStartResp,
          malformed,
          as_account(account),
        ),
      signed_in_accounts: get(HttpClientRequest.get("/v1/sessions/accounts"), C.SignedInAccountsResp),
      enable_email_sign_in: post_empty("/v1/account/sign-in-methods/email", C.SignInMethodsResp),
      remove_sign_in: (kind: C.SignInKind, totp_code: Option.Option<string>) =>
        post(
          path_of("/v1/account/sign-in-methods", kind, "/remove"),
          C.SignInMethodRemoveReq,
          Option.match(totp_code, { onNone: () => ({}), onSome: (code) => ({ totpCode: code }) }),
          C.SignInMethodsResp,
          malformed,
        ),
      enroll_totp: post_empty("/v1/auth/totp/enroll", C.TotpEnrollResp),
      verify_totp: (code: string) =>
        post("/v1/auth/totp/verify", C.TotpVerifyReq, { code }, C.TotpVerifyResp, malformed),
      disable_totp: (code: string) =>
        post("/v1/auth/totp/disable", C.TotpDisableReq, { code }, C.TotpDisableResp, malformed),
      me: get(HttpClientRequest.get("/v1/me"), C.MeResp),
      sessions: get(HttpClientRequest.get("/v1/sessions"), C.SessionListResp),
      revoke_current_session: post_empty("/v1/sessions/current/revoke", C.Revoked),
      revoke_session: (session_id: string) => post_empty(path_of("/v1/sessions", session_id, "/revoke"), C.Revoked),
      revoke_all_sessions: post_empty("/v1/sessions/revoke-all", C.Revoked),
      disable_account: post_empty("/v1/account/disable", Schema.Struct({ disabled: Schema.Boolean })),
      claim_enrollment: (code: string) =>
        post("/v1/machines/enrollments/claim", C.EnrollmentClaimReq, { code }, C.EnrollmentClaimResp, malformed),
      machines: get(HttpClientRequest.get("/v1/machines"), C.MachineListResp),
      revoke_machine: (machine_id: string) => post_empty(path_of("/v1/machines", machine_id, "/revoke"), C.Revoked),
      issue_grant: (request: C.GrantIssueReq) =>
        post("/v1/grants/issue", C.GrantIssueReq, request, C.GrantIssueResp, malformed),
      provider_connections: get(HttpClientRequest.get("/v1/vault/connections"), C.ProviderListResp),
      create_provider_connection: (provider: C.ProviderKind, label: string, api_key: string) =>
        post(
          "/v1/vault/connections",
          C.ProviderCreateReq,
          { provider, label, apiKey: api_key },
          C.ProviderInfo,
          malformed,
        ),
      revoke_provider_connection: (connection_id: string) =>
        post_empty(path_of("/v1/vault/connections", connection_id, "/revoke"), C.Revoked),
      assign_connection: (connection_id: string, machine_id: string) =>
        post(
          "/v1/vault/assignments",
          C.AssignReq,
          { connectionId: connection_id, machineId: machine_id },
          C.AssignResp,
          malformed,
        ),
      unassign_connection: (connection_id: string, machine_id: string) =>
        post(
          "/v1/vault/assignments/remove",
          C.AssignReq,
          { connectionId: connection_id, machineId: machine_id },
          C.Unassigned,
          malformed,
        ),
      artifacts: get(HttpClientRequest.get("/v1/engine-artifacts"), C.ArtifactListResp),
      revoke_artifact: (artifact_id: string) =>
        post_empty(path_of("/v1/engine-artifacts", artifact_id, "/revoke"), C.Revoked),
      assign_artifact: (artifact_id: string, machine_id: string) =>
        post(
          "/v1/engine-artifacts/assignments",
          C.ArtifactAssignReq,
          { artifactId: artifact_id, machineId: machine_id },
          C.ArtifactAssignResp,
          malformed,
        ),
      unassign_artifact: (artifact_id: string, machine_id: string) =>
        post(
          "/v1/engine-artifacts/assignments/remove",
          C.ArtifactAssignReq,
          { artifactId: artifact_id, machineId: machine_id },
          C.Unassigned,
          malformed,
        ),
      publish_bundle: (manifest: C.EditorManifest) =>
        post("/v1/config/bundles", C.BundlePublishReq, { manifest }, C.BundleInfo, malformed),
      latest_bundle: get(HttpClientRequest.get("/v1/config/bundles/latest"), C.BundleLatestResp),
      config_state: (machine_id: string) =>
        get(
          HttpClientRequest.get("/v1/config/state").pipe(HttpClientRequest.setUrlParam("machineId", machine_id)),
          C.ConfigStateResp,
        ),
      activity: (limit: number) =>
        get(
          HttpClientRequest.get("/v1/activity").pipe(HttpClientRequest.setUrlParam("limit", String(limit))),
          C.ActivityResp,
        ),
      request_deletion: (totp_code: Option.Option<string>) =>
        post(
          "/v1/account/deletion/request",
          C.DeletionRequestReq,
          Option.match(totp_code, { onNone: () => ({}), onSome: (code) => ({ totpCode: code }) }),
          C.DeletionStatusResp,
          malformed,
        ),
      deletion_status: get(HttpClientRequest.get("/v1/account/deletion"), C.DeletionStatusResp),
      cancel_deletion: post_empty("/v1/account/deletion/cancel", C.DeletionStatusResp),
      version: get(HttpClientRequest.get("/v1/version"), C.VersionResp),
    };
  });

export class CoreApi extends Context.Service<CoreApi, Effect.Success<ReturnType<typeof make>>>()(
  "@artisanstreet/core-client/CoreApi",
) {
  static readonly layer = (
    base: string,
    fetch: typeof globalThis.fetch,
    active_account: Effect.Effect<Option.Option<string>> = Effect.succeedNone,
  ) =>
    Layer.effect(CoreApi, make(base, active_account)).pipe(
      Layer.provide(
        FetchHttpClient.layer.pipe(
          Layer.provide(
            Layer.mergeAll(
              Layer.succeed(FetchHttpClient.Fetch)(fetch),
              Layer.succeed(FetchHttpClient.RequestInit)({ credentials: "include" }),
              Layer.succeed(HttpClient.TracerPropagationEnabled)(false),
            ),
          ),
        ),
      ),
    );
}
