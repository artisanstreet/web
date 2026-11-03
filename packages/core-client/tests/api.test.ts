import { Effect, Exit, Option } from "effect";
import { describe, expect, it } from "vitest";
import { CoreApi } from "../src/api.ts";
import { ApiFailure, DecodeFailure, InvalidEmail, InvalidRequest, TransportFailure } from "../src/errors.ts";
import { SecondFactor } from "../src/finalize.ts";

interface Sent {
  readonly url: string;
  readonly method: string;
  readonly headers: Headers;
  readonly credentials: RequestCredentials | undefined;
  readonly body: unknown;
}

type Reply = () => Promise<Response>;

const reply =
  (status: number, body: unknown): Reply =>
  () =>
    Promise.resolve(
      new Response(typeof body === "string" ? body : JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
    );

const unreachable: Reply = () => Promise.reject(new TypeError("Failed to fetch"));

const read_body = (body: BodyInit | null | undefined): unknown =>
  body === undefined || body === null
    ? undefined
    : JSON.parse(typeof body === "string" ? body : new TextDecoder().decode(body as Uint8Array));

const ulid = "AAAAAAAAAAAAAAAAAAAAAAAAAA";
const request_id = `logreq_${ulid}`;
const machine_id = `mch_${ulid}`;

const me_body = {
  account_id: `acct_${ulid}`,
  email: "ada@artisan.email",
  display_name: "Ada",
  avatar_url: null,
  totp_enrolled: false,
  machines: [],
  provider_connections: [],
  latest_config_version: null,
};

const deletion_body = { status: "none", requested_at: null, purge_after: null, completed_at: null };

const finalized_body = {
  session_id: `sess_${ulid}`,
  account_id: `acct_${ulid}`,
  expires_at: "2026-10-29T12:00:00Z",
  totp_verified: true,
};

const core = (replies: ReadonlyArray<Reply>, active: Option.Option<string> = Option.none()) => {
  const sent: Array<Sent> = [];
  const fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    sent.push({
      url: String(input),
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      credentials: init?.credentials,
      body: read_body(init?.body),
    });
    const next = replies[sent.length - 1] ?? replies[replies.length - 1] ?? unreachable;
    return next();
  }) as typeof globalThis.fetch;
  const run = <A, E>(call: (api: typeof CoreApi.Service) => Effect.Effect<A, E>) =>
    Effect.runPromiseExit(
      Effect.flatMap(CoreApi, call).pipe(Effect.provide(CoreApi.layer("http://core.test", fetch, Effect.succeed(active)))),
    );
  return { sent, run };
};

const failure_of = <A, E>(exit: Exit.Exit<A, E>) => Option.getOrUndefined(Exit.findErrorOption(exit));

describe("CoreApi requests", () => {
  it("sends reads to the base url with cookies, a json accept header and no trace header", async () => {
    const { sent, run } = core([reply(200, me_body)]);
    const exit = await run((api) => api.me.pipe(Effect.withSpan("page")));
    expect(Exit.isSuccess(exit)).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.url).toBe("http://core.test/v1/me");
    expect(sent[0]?.method).toBe("GET");
    expect(sent[0]?.credentials).toBe("include");
    expect(sent[0]?.headers.get("accept")).toBe("application/json");
    expect(sent[0]?.headers.get("traceparent")).toBeNull();
  });

  it("names the active account on every request unless a call names its own", async () => {
    const start = { flow_id: `oflow_${ulid}`, flow_secret: "secret", authorize_url: "https://github.com/login" };
    const { sent, run } = core([reply(200, me_body), reply(200, start), reply(200, start)], Option.some(`acct_${ulid}`));
    await run((api) => api.me);
    await run((api) => api.link_sign_in("github", Option.none()));
    await run((api) => api.link_sign_in("github", Option.some("acct_BBBBBBBBBBBBBBBBBBBBBBBBBB")));
    expect(sent.map((request) => request.headers.get("x-ast-account"))).toEqual([
      `acct_${ulid}`,
      `acct_${ulid}`,
      "acct_BBBBBBBBBBBBBBBBBBBBBBBBBB",
    ]);
  });

  it("sends the second factor as the matching camelCase field", async () => {
    const { sent, run } = core([reply(200, finalized_body)]);
    const payload = (factor: SecondFactor) => ({ request_id, request_secret: "secret", factor });
    await run((api) => api.finalize_magic_link(payload(SecondFactor.Totp({ code: "123456" }))));
    await run((api) => api.finalize_magic_link(payload(SecondFactor.Recovery({ code: "k7f2" }))));
    await run((api) => api.finalize_magic_link(payload(SecondFactor.None())));
    expect(sent.map(({ method, url, credentials }) => [method, url, credentials])).toEqual([
      ["POST", "http://core.test/v1/auth/magic/finalize", "include"],
      ["POST", "http://core.test/v1/auth/magic/finalize", "include"],
      ["POST", "http://core.test/v1/auth/magic/finalize", "include"],
    ]);
    expect(sent.map(({ body }) => body)).toEqual([
      { requestId: request_id, requestSecret: "secret", totpCode: "123456" },
      { requestId: request_id, requestSecret: "secret", recoveryCode: "k7f2" },
      { requestId: request_id, requestSecret: "secret" },
    ]);
  });

  it("escapes ids in paths and sends machine ids and limits as query parameters", async () => {
    const { sent, run } = core([reply(200, { revoked: true }), reply(200, { events: [] }), reply(500, {})]);
    await run((api) => api.revoke_machine("mch/../admin"));
    await run((api) => api.activity(25));
    await run((api) => api.config_state(machine_id));
    expect(sent.map(({ url }) => url)).toEqual([
      "http://core.test/v1/machines/mch%2F..%2Fadmin/revoke",
      "http://core.test/v1/activity?limit=25",
      `http://core.test/v1/config/state?machineId=${machine_id}`,
    ]);
    expect(sent[0]?.body).toEqual({});
  });

  it("only sends the deletion code when there is one", async () => {
    const { sent, run } = core([reply(200, deletion_body)]);
    await run((api) => api.request_deletion(Option.none()));
    await run((api) => api.request_deletion(Option.some("123456")));
    expect(sent.map(({ body }) => body)).toEqual([{}, { totpCode: "123456" }]);
  });

  it("refuses a malformed email without calling Core", async () => {
    const { sent, run } = core([reply(200, {})]);
    const exit = await run((api) => api.request_magic_link("not an email"));
    expect(failure_of(exit)).toBeInstanceOf(InvalidEmail);
    expect(sent).toHaveLength(0);
  });

  it("refuses request bodies with fields Core does not know", async () => {
    const { sent, run } = core([reply(200, {})]);
    const grant = { audience: "ast-core", scope: ["machine:sync"], admin: true } as const;
    const exit = await run((api) => api.issue_grant(grant));
    expect(failure_of(exit)).toEqual(new InvalidRequest({ reason: "malformed request" }));
    expect(sent).toHaveLength(0);
  });
});

describe("CoreApi responses", () => {
  it("turns the Core error envelope into an ApiFailure", async () => {
    const { run } = core([
      reply(401, { error: { code: "unauthorized", message: "no session", request_id: "req_1" } }),
      reply(409, { error: { code: "conflict", message: "already claimed" } }),
    ]);
    expect(failure_of(await run((api) => api.revoke_all_sessions))).toEqual(
      new ApiFailure({ status: 401, code: "unauthorized", message: "no session", request_id: "req_1" }),
    );
    expect(failure_of(await run((api) => api.claim_enrollment("ABCD-1234")))).toEqual(
      new ApiFailure({ status: 409, code: "conflict", message: "already claimed", request_id: "" }),
    );
  });

  it("reports error bodies without an envelope and unreadable bodies as decode failures", async () => {
    const { run } = core([reply(502, { oops: true }), reply(200, "<html>")]);
    expect(failure_of(await run((api) => api.cancel_deletion))).toEqual(new DecodeFailure({ reason: "status 502" }));
    expect(failure_of(await run((api) => api.cancel_deletion))).toEqual(
      new DecodeFailure({ reason: "unreadable body 200" }),
    );
  });

  it("rejects success bodies of the wrong shape and ignores fields it does not know", async () => {
    const { run } = core([reply(200, { ...me_body, email: 42 }), reply(200, { ...me_body, plan: "pro" })]);
    expect(failure_of(await run((api) => api.me))).toEqual(new DecodeFailure({ reason: "unreadable shape" }));
    const exit = await run((api) => api.me);
    expect(Exit.isSuccess(exit) && exit.value).toEqual(me_body);
  });

  it("retries reads through transient failures", async () => {
    const { sent, run } = core([unreachable, reply(503, { error: { code: "busy", message: "busy" } }), reply(200, deletion_body)]);
    const exit = await run((api) => api.deletion_status);
    expect(Exit.isSuccess(exit)).toBe(true);
    expect(sent).toHaveLength(3);
  });

  it("gives up on reads after two retries", async () => {
    const { sent, run } = core([unreachable]);
    expect(failure_of(await run((api) => api.version))).toBeInstanceOf(TransportFailure);
    expect(sent).toHaveLength(3);
  });

  it("does not retry reads Core refused", async () => {
    const { sent, run } = core([reply(401, { error: { code: "unauthorized", message: "no session" } })]);
    expect(failure_of(await run((api) => api.sessions))).toBeInstanceOf(ApiFailure);
    expect(sent).toHaveLength(1);
  });

  it("never retries writes", async () => {
    const { sent, run } = core([reply(503, { error: { code: "busy", message: "busy" } })]);
    const exit = await run((api) => api.login_status(request_id, "secret"));
    expect(failure_of(exit)).toEqual(new ApiFailure({ status: 503, code: "busy", message: "busy", request_id: "" }));
    expect(sent).toHaveLength(1);
  });
});
