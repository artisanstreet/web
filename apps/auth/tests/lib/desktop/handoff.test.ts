import { Option } from "effect";
import { describe, expect, it } from "vitest";
import {
  Back,
  back_of,
  DesktopDone,
  DesktopProblem,
  DesktopRequest,
  desktop_done_of,
  desktop_request_of,
  granted_url,
  refused_url,
  Setback,
  type DesktopHandoff,
} from "../../../src/lib/desktop/handoff.ts";
import { OauthProblem } from "../../../src/lib/sign-in/oauth.ts";

const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
const state = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";

const handoff: DesktopHandoff = { port: 49152, challenge, state };

const at = (path: string) => new URL(path, "https://auth.artisan.st");

const desktop = (params: Record<string, string>) => desktop_request_of(at(`/desktop?${new URLSearchParams(params)}`));

const complete = { provider: "google", port: "49152", challenge, state };

describe("desktop_request_of", () => {
  it("accepts a complete request from the Editor", () => {
    expect(desktop(complete)).toEqual(DesktopRequest.Valid({ provider: "google", handoff }));
    expect(desktop({ ...complete, provider: "github", port: "1024" })).toEqual(
      DesktopRequest.Valid({ provider: "github", handoff: { ...handoff, port: 1024 } }),
    );
    expect(desktop({ ...complete, port: "65535" })).toEqual(
      DesktopRequest.Valid({ provider: "google", handoff: { ...handoff, port: 65535 } }),
    );
  });

  it("refuses ports outside the unprivileged range or not written as plain digits", () => {
    ["1023", "65536", "0", "-5000", "0x400", "1e4", "4915.2", " 49152", "", "99999"].forEach((port) =>
      expect(desktop({ ...complete, port })).toEqual(DesktopRequest.Invalid()),
    );
  });

  it("refuses providers we do not support", () => {
    expect(desktop({ ...complete, provider: "apple" })).toEqual(DesktopRequest.Invalid());
  });

  it("refuses a challenge or state that is not 43 base64url characters", () => {
    expect(desktop({ ...complete, challenge: challenge.slice(1) })).toEqual(DesktopRequest.Invalid());
    expect(desktop({ ...complete, challenge: `${challenge}A` })).toEqual(DesktopRequest.Invalid());
    expect(desktop({ ...complete, state: `${state.slice(1)}+` })).toEqual(DesktopRequest.Invalid());
    expect(desktop({ ...complete, state: `${state.slice(1)}=` })).toEqual(DesktopRequest.Invalid());
  });

  it("refuses a request missing any part", () => {
    Object.keys(complete).forEach((missing) =>
      expect(
        desktop(Object.fromEntries(Object.entries(complete).filter(([name]) => name !== missing))),
      ).toEqual(DesktopRequest.Invalid()),
    );
  });
});

describe("loopback urls", () => {
  it("hands the code and state to the Editor on its loopback port", () => {
    expect(granted_url(handoff, "dsk_a+b/c")).toBe(
      `http://127.0.0.1:49152/callback?code=dsk_a%2Bb%2Fc&state=${state}`,
    );
  });

  it("tells the Editor why sign-in stopped", () => {
    expect(refused_url(handoff, DesktopProblem.Oauth({ problem: OauthProblem.EmailTaken() }))).toBe(
      `http://127.0.0.1:49152/callback?state=${state}&error=email-taken`,
    );
  });
});

describe("back_of", () => {
  const denied = Setback.Provider({ provider: "github", problem: OauthProblem.Denied() });

  it("sends web sign-in failures back to the sign-in page", () => {
    expect(back_of(Option.none(), denied)).toEqual(Back.SignIn({ url: "/?provider=github&problem=denied" }));
    expect(back_of(Option.none(), Setback.Lost())).toEqual(Back.Stay());
    expect(back_of(Option.none(), Setback.Failed())).toEqual(Back.Stay());
  });

  it("sends every failure to the Editor while a desktop sign-in is pending", () => {
    const editor = (error: string) => Back.Editor({ url: `http://127.0.0.1:49152/callback?state=${state}&error=${error}` });
    expect(back_of(Option.some(handoff), denied)).toEqual(editor("denied"));
    expect(
      back_of(Option.some(handoff), Setback.Provider({ provider: "google", problem: OauthProblem.NoVerifiedEmail() })),
    ).toEqual(editor("no-verified-email"));
    expect(back_of(Option.some(handoff), Setback.Lost())).toEqual(editor("lost"));
    expect(back_of(Option.some(handoff), Setback.Failed())).toEqual(editor("unavailable"));
  });
});

describe("desktop_done_of", () => {
  const done = (query: string) => desktop_done_of(at(`/desktop/done${query}`));

  it("reads a plain landing as signed in", () => {
    expect(done("")).toEqual(DesktopDone.SignedIn());
  });

  it("reads the problem the Editor reported", () => {
    expect(done("?problem=cancelled")).toEqual(DesktopDone.Failed({ problem: Option.some(DesktopProblem.Cancelled()) }));
    expect(done("?problem=expired")).toEqual(DesktopDone.Failed({ problem: Option.some(DesktopProblem.Expired()) }));
    expect(done("?problem=unavailable")).toEqual(
      DesktopDone.Failed({ problem: Option.some(DesktopProblem.Oauth({ problem: OauthProblem.Unavailable() })) }),
    );
  });

  it("still reports a failure when the problem is one it does not know", () => {
    expect(done("?problem=gremlins")).toEqual(DesktopDone.Failed({ problem: Option.none() }));
    expect(done("?problem=")).toEqual(DesktopDone.Failed({ problem: Option.none() }));
  });
});
