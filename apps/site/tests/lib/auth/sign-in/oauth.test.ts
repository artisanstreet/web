import { Option } from "effect";
import { describe, expect, it } from "vitest";
import {
  Landing,
  landing_of,
  OauthProblem,
  provider_problem_of,
  provider_return_of,
  ProviderReturn,
  sign_in_url_with,
  type PendingFlow,
} from "../../../../src/lib/auth/sign-in/oauth.ts";

const pending: PendingFlow = {
  flow_id: "oflow_01M67Q9PNT1KCTV4TNBK89H50P",
  flow_secret: "secret",
  provider: "github",
  destination: "https://artisan.st/dashboard",
};

const at = (path: string) => new URL(path, "https://artisan.st");

describe("landing_of", () => {
  it("sends a signed-in account to where it was going", () => {
    const signed_in = landing_of(pending, {
      outcome: "signed_in",
      session_id: "sess_01M67Q9PNT1KCTV4TNBK89H50P",
      account_id: "acct_01M67Q9PNT1KCTV4TNBK89H50P",
      expires_at: "2026-11-30T00:00:00Z",
      totp_verified: false,
    });
    expect(signed_in).toEqual(Landing.Enter({ destination: pending.destination }));
  });

  it("returns a link attempt to where it started, saying how it went", () => {
    expect(landing_of(pending, { outcome: "linked", provider: "github" })).toEqual(
      Landing.Enter({ destination: "https://artisan.st/dashboard?linked=github" }),
    );
    expect(landing_of(pending, { outcome: "linked_elsewhere" })).toEqual(
      Landing.Enter({ destination: "https://artisan.st/dashboard?link_problem=elsewhere&provider=github" }),
    );
  });

  it("prefills sign-up from the provider profile", () => {
    const landing = landing_of(pending, {
      outcome: "signup_required",
      email: "ada@example.com",
      display_name: "Ada Lovelace",
      avatar_url: null,
    });
    expect(landing).toEqual(
      Landing.Signup({ profile: { email: "ada@example.com", display_name: "Ada Lovelace", avatar_url: null } }),
    );
  });

  it("sends refusals back to the sign-in page with the reason", () => {
    expect(landing_of(pending, { outcome: "email_taken", email: "ada@example.com" })).toEqual(
      Landing.Back({ problem: OauthProblem.EmailTaken() }),
    );
    expect(landing_of(pending, { outcome: "no_verified_email" })).toEqual(
      Landing.Back({ problem: OauthProblem.NoVerifiedEmail() }),
    );
  });
});

describe("provider_return_of", () => {
  it("reads the code and state the provider returned", () => {
    expect(provider_return_of(at("/auth/oauth/callback?code=abc&state=xyz"))).toEqual(
      ProviderReturn.Code({ code: "abc", state: "xyz" }),
    );
  });

  it("treats a provider error as a refusal even when a code is present", () => {
    expect(provider_return_of(at("/auth/oauth/callback?error=access_denied&code=abc&state=xyz"))).toEqual(
      ProviderReturn.Refused(),
    );
  });

  it("rejects a return without a state", () => {
    expect(provider_return_of(at("/auth/oauth/callback?code=abc"))).toEqual(ProviderReturn.Malformed());
  });
});

describe("provider problems in the sign-in URL", () => {
  it("round-trips every problem", () => {
    for (const problem of [
      OauthProblem.Denied(),
      OauthProblem.Unavailable(),
      OauthProblem.NoVerifiedEmail(),
      OauthProblem.EmailTaken(),
    ]) {
      expect(provider_problem_of(at(sign_in_url_with("google", problem)))).toEqual(
        Option.some({ provider: "google", problem }),
      );
    }
  });

  it("ignores unknown providers and problems", () => {
    expect(provider_problem_of(at("/?provider=apple&problem=denied"))).toEqual(Option.none());
    expect(provider_problem_of(at("/?provider=github&problem=exploded"))).toEqual(Option.none());
  });
});
