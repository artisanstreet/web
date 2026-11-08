import { Option } from "effect";
import { describe, expect, it } from "vitest";
import { FinishProblem, Flow } from "../../../../src/lib/auth/sign-in/flow.ts";
import type { LoginState } from "../../../../src/lib/auth/sign-in/state.ts";
import {
  checked_email,
  EmailField,
  EmailProblem,
  FactorKind,
  FactorStep,
  finish_error_of,
  rejected_message,
  SignInView,
  view_of,
} from "../../../../src/lib/auth/sign-in/view.ts";

const login = (totp_required: boolean): LoginState => ({
  request_id: "logreq_1",
  email: "ada@artisan.email",
  expires_at: "2026-10-29T12:00:00Z",
  phase: "email_approved",
  totp_required,
});

describe("checked_email", () => {
  it("asks for an address when nothing was typed", () => {
    expect(checked_email("   ")).toEqual(EmailField.Invalid({ email: "", problem: EmailProblem.Missing() }));
  });

  it("flags addresses that cannot be emailed", () => {
    expect(checked_email("ada@")).toEqual(EmailField.Invalid({ email: "ada@", problem: EmailProblem.Malformed() }));
    expect(checked_email("ada artisan@x.io")).toEqual(
      EmailField.Invalid({ email: "ada artisan@x.io", problem: EmailProblem.Malformed() }),
    );
  });

  it("accepts a trimmed address", () => {
    expect(checked_email("  ada@artisan.email ")).toEqual(EmailField.Filled({ email: "ada@artisan.email" }));
  });
});

describe("view_of second factor", () => {
  const field = EmailField.Filled({ email: "ada@artisan.email" });
  const authenticator = { kind: FactorKind.Authenticator(), code: "482913" };
  const recovery = { kind: FactorKind.Recovery(), code: "k7f2-9xqm-41ab" };

  it("asks for a code once an account with 2FA is approved", () => {
    expect(view_of(Flow.Approved({ login: login(true), error: Option.none() }), field, authenticator)).toEqual(
      SignInView.SecondFactor({
        email: "ada@artisan.email",
        kind: FactorKind.Authenticator(),
        step: FactorStep.Entering({ code: "482913" }),
      }),
    );
  });

  it("shows the code as verifying while finishing", () => {
    expect(view_of(Flow.Finishing({ login: login(true) }), field, recovery)).toEqual(
      SignInView.SecondFactor({
        email: "ada@artisan.email",
        kind: FactorKind.Recovery(),
        step: FactorStep.Verifying({ code: "k7f2-9xqm-41ab" }),
      }),
    );
  });

  it("explains a rejected code in terms of the kind entered", () => {
    const flow = Flow.Approved({ login: login(true), error: Option.some(FinishProblem.CodeRejected()) });
    expect(view_of(flow, field, recovery)).toEqual(
      SignInView.SecondFactor({
        email: "ada@artisan.email",
        kind: FactorKind.Recovery(),
        step: FactorStep.Rejected({ code: "k7f2-9xqm-41ab", message: rejected_message(FactorKind.Recovery()) }),
      }),
    );
  });

  it("keeps other finishing failures in their own words", () => {
    const flow = Flow.Approved({
      login: login(true),
      error: Option.some(FinishProblem.Failed({ message: "We couldn't reach the account service." })),
    });
    expect(view_of(flow, field, authenticator)).toEqual(
      SignInView.SecondFactor({
        email: "ada@artisan.email",
        kind: FactorKind.Authenticator(),
        step: FactorStep.Rejected({ code: "482913", message: "We couldn't reach the account service." }),
      }),
    );
  });

  it("fails visibly when an account without 2FA cannot finish", () => {
    const flow = Flow.Approved({
      login: login(false),
      error: Option.some(FinishProblem.Failed({ message: "Our account service hit an error on its side." })),
    });
    expect(view_of(flow, field)).toEqual(SignInView.Failed({ message: "Our account service hit an error on its side." }));
  });
});

describe("finish_error_of", () => {
  it("words a rejected code for the kind on screen", () => {
    const flow = Flow.Approved({ login: login(true), error: Option.some(FinishProblem.CodeRejected()) });
    expect(finish_error_of(flow, FactorKind.Authenticator())).toEqual(
      Option.some(rejected_message(FactorKind.Authenticator())),
    );
  });

  it("falls back to the flow's own failure", () => {
    expect(finish_error_of(Flow.Failed({ message: "nope" }), FactorKind.Recovery())).toEqual(Option.some("nope"));
    expect(finish_error_of(Flow.Finishing({ login: login(true) }), FactorKind.Recovery())).toEqual(Option.none());
  });
});
