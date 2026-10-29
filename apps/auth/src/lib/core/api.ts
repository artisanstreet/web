import { Context, Effect, flow, Layer, Schedule, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import * as C from "./contract.ts";
import {
  ApiFailure,
  DecodeFailure,
  InvalidEmail,
  is_transient,
  TransportFailure,
  type CoreFailure,
} from "./errors.ts";
import { SecondFactor, type FinalizePayload } from "../sign-in/state.ts";

export class CoreApi extends Context.Service<
  CoreApi,
  {
    readonly request_magic_link: (
      email: string,
    ) => Effect.Effect<C.MagicRequestResp, CoreFailure | InvalidEmail>;
    readonly login_status: (
      request_id: string,
      request_secret: string,
    ) => Effect.Effect<C.MagicStatusResp, CoreFailure>;
    readonly consume_magic_link: (token: string) => Effect.Effect<C.MagicConsumeResp, CoreFailure>;
    readonly finalize_magic_link: (
      payload: FinalizePayload,
    ) => Effect.Effect<C.MagicFinalizeResp, CoreFailure>;
    readonly me: Effect.Effect<C.MeResp, CoreFailure>;
  }
>()("auth/CoreApi") {
  static readonly layer = (base: string, fetch: typeof globalThis.fetch) =>
    Layer.effect(CoreApi, make(base)).pipe(
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

const factor_fields = SecondFactor.$match({
  None: () => ({}),
  Totp: ({ code }) => ({ totpCode: code }),
  Recovery: ({ code }) => ({ recoveryCode: code }),
});

const malformed = () => new DecodeFailure({ reason: "malformed request" });

const make = (base: string) =>
  Effect.gen(function* () {
    const client = (yield* HttpClient.HttpClient).pipe(
      HttpClient.mapRequest(flow(HttpClientRequest.prependUrl(base), HttpClientRequest.acceptJson)),
    );

    const execute = <A>(request: HttpClientRequest.HttpClientRequest, schema: Schema.Codec<A, unknown>) =>
      client.execute(request).pipe(
        Effect.mapError(() => new TransportFailure()),
        Effect.flatMap(decode_response(schema)),
      );

    const post = <A, B, E>(
      path: string,
      request_schema: Schema.Codec<B, unknown>,
      body: B,
      response_schema: Schema.Codec<A, unknown>,
      invalid: () => E,
    ) =>
      Schema.encodeUnknownEffect(request_schema, strict)(body).pipe(
        Effect.mapError(invalid),
        Effect.flatMap((encoded) =>
          execute(HttpClientRequest.post(path).pipe(HttpClientRequest.bodyJsonUnsafe(encoded)), response_schema),
        ),
      );

    return {
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
      me: execute(HttpClientRequest.get("/v1/me"), C.MeResp).pipe(
        Effect.retry({ while: is_transient, times: 2, schedule: Schedule.exponential("200 millis") }),
      ),
    };
  });
