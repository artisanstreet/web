import { Data, Option } from "effect";
import { ApiFailure, DecodeFailure, InvalidEmail, InvalidRequest, TransportFailure } from "@artisanstreet/core-client";
import { Approval } from "./approve.ts";
import { FinishProblem, Flow } from "./flow.ts";
import { friendly_error } from "./messages.ts";
import {
  FinalizeExpired,
  FinalizeMissingSecret,
  FinalizeNotApproved,
  FinalizeTotpRequired,
  RequestLost,
  type LoginState,
} from "./state.ts";
import { EmailField, EmailProblem, FactorKind, FactorStep, rejected_message, oauth_failure, OauthProblem, ProviderAction, SignInView, view_of, type Provider } from "./view.ts";

export type Scene = Data.TaggedEnum<{
  SignIn: { readonly view: SignInView };
  Approve: {
    readonly approval: Approval;
    readonly finish: Flow;
    readonly use_recovery: boolean;
    readonly token: boolean;
  };
}>;

export const Scene = Data.taggedEnum<Scene>();

export interface Scenario {
  readonly id: string;
  readonly group: string;
  readonly label: string;
  readonly scene: Scene;
}

const email = "ada@artisan.email";

const login = (totp_required: boolean): LoginState => ({
  request_id: "debug-request",
  email,
  expires_at: "2026-10-29T12:00:00Z",
  phase: "email_approved",
  totp_required,
});

const api_failure = (status: number, message: string) =>
  new ApiFailure({ status, code: "debug", message, request_id: "debug-request" });

const sign_in = (group: string, id: string, label: string, view: SignInView): Scenario => ({
  id: `sign-in/${id}`,
  group,
  label,
  scene: Scene.SignIn({ view }),
});

const approve = (
  group: string,
  id: string,
  label: string,
  approval: Approval,
  options: { finish?: Flow; use_recovery?: boolean; token?: boolean } = {},
): Scenario => ({
  id: `approve/${id}`,
  group,
  label,
  scene: Scene.Approve({
    approval,
    finish: options.finish ?? Flow.Idle(),
    use_recovery: options.use_recovery ?? false,
    token: options.token ?? true,
  }),
});

const form = (field: EmailField, provider: ProviderAction = ProviderAction.Ready()) =>
  SignInView.Form({ email: field, provider });

const failed = (failure: Parameters<typeof friendly_error>[0]) =>
  SignInView.Failed({ message: friendly_error(failure) });

const oauth_problems: ReadonlyArray<readonly [string, string, OauthProblem]> = [
  ["unavailable", "unavailable", OauthProblem.Unavailable()],
  ["denied", "cancelled", OauthProblem.Denied()],
  ["no-email", "no verified email", OauthProblem.NoVerifiedEmail()],
  ["email-taken", "email already used", OauthProblem.EmailTaken()],
];

const oauth_providers: ReadonlyArray<readonly [Provider, string]> = [
  ["google", "Google"],
  ["github", "GitHub"],
];

const oauth_scenarios: ReadonlyArray<Scenario> = oauth_providers.flatMap(([provider, name]) =>
  oauth_problems.map(([id, label, problem]) =>
    sign_in(
      "Sign in · providers",
      `${provider}-${id}`,
      `${name}: ${label}`,
      form(EmailField.Empty(), oauth_failure(provider, problem)),
    ),
  ),
);

const factor_view = (kind: FactorKind, step: FactorStep) => SignInView.SecondFactor({ email, kind, step });

const sign_in_factor_group = "Sign in · second factor";

const form_group = "Sign in · form";
const request_group = "Sign in · request";
const failure_group = "Sign in · failures";
const providers_group = "Sign in · providers";
const approve_group = "Approve · link";
const factor_group = "Approve · second factor";
const finish_group = "Approve · finishing";

export const scenarios: ReadonlyArray<Scenario> = [
  sign_in(form_group, "empty", "Empty", form(EmailField.Empty())),
  sign_in(form_group, "filled", "Valid email typed", form(EmailField.Filled({ email }))),
  sign_in(form_group, "partial", "Partial email typed", form(EmailField.Filled({ email: "ada@" }))),
  sign_in(
    form_group,
    "missing",
    "Submitted empty",
    form(EmailField.Invalid({ email: "", problem: EmailProblem.Missing() })),
  ),
  sign_in(
    form_group,
    "malformed",
    "Malformed email",
    form(EmailField.Invalid({ email: "ada@", problem: EmailProblem.Malformed() })),
  ),
  sign_in(
    form_group,
    "malformed-long",
    "Malformed, very long address",
    form(
      EmailField.Invalid({
        email: `${"a".repeat(80)}@${"b".repeat(80)}`,
        problem: EmailProblem.Malformed(),
      }),
    ),
  ),
  sign_in(request_group, "sending", "Sending the link", SignInView.Sending({ email })),
  sign_in(request_group, "waiting", "Waiting for approval", SignInView.Waiting({ email })),
  sign_in(request_group, "approved", "Approved, no second factor", SignInView.Approved({ email })),
  sign_in(sign_in_factor_group, "totp-empty", "Authenticator, empty", factor_view(FactorKind.Authenticator(), FactorStep.Entering({ code: "" }))),
  sign_in(sign_in_factor_group, "totp-partial", "Authenticator, partial code", factor_view(FactorKind.Authenticator(), FactorStep.Entering({ code: "482" }))),
  sign_in(sign_in_factor_group, "totp-full", "Authenticator, full code", factor_view(FactorKind.Authenticator(), FactorStep.Entering({ code: "482913" }))),
  sign_in(sign_in_factor_group, "totp-verifying", "Authenticator, verifying", factor_view(FactorKind.Authenticator(), FactorStep.Verifying({ code: "482913" }))),
  sign_in(
    sign_in_factor_group,
    "totp-rejected",
    "Authenticator, rejected",
    factor_view(FactorKind.Authenticator(), FactorStep.Rejected({ code: "482913", message: rejected_message(FactorKind.Authenticator()) })),
  ),
  sign_in(sign_in_factor_group, "recovery-empty", "Recovery, empty", factor_view(FactorKind.Recovery(), FactorStep.Entering({ code: "" }))),
  sign_in(sign_in_factor_group, "recovery-full", "Recovery, code typed", factor_view(FactorKind.Recovery(), FactorStep.Entering({ code: "k7f2-9xqm-41ab" }))),
  sign_in(sign_in_factor_group, "recovery-verifying", "Recovery, verifying", factor_view(FactorKind.Recovery(), FactorStep.Verifying({ code: "k7f2-9xqm-41ab" }))),
  sign_in(
    sign_in_factor_group,
    "recovery-rejected",
    "Recovery, rejected",
    factor_view(FactorKind.Recovery(), FactorStep.Rejected({ code: "k7f2-9xqm-41ab", message: rejected_message(FactorKind.Recovery()) })),
  ),
  sign_in(request_group, "finishing", "Finishing sign-in", SignInView.Finishing({ email })),
  sign_in(request_group, "signed-in", "Signed in, redirecting", SignInView.SignedIn({ destination: "https://dashboard.artisan.st" })),
  sign_in(request_group, "expired", "Link expired", view_of(Flow.Expired(), EmailField.Empty())),
  sign_in(failure_group, "rate-limited", "Too many attempts", failed(api_failure(429, "rate limited"))),
  sign_in(failure_group, "server-error", "Account service error", failed(api_failure(503, "unavailable"))),
  sign_in(failure_group, "rejected", "Service rejected the request", failed(api_failure(400, "We can't send sign-in links to that address. Try another one."))),
  sign_in(failure_group, "unreachable", "Service unreachable", failed(new TransportFailure())),
  sign_in(failure_group, "unreadable", "Unreadable response", failed(new DecodeFailure({ reason: "debug" }))),
  sign_in(failure_group, "invalid-request", "Request could not be built", failed(new InvalidRequest({ reason: "debug" }))),
  sign_in(failure_group, "invalid-email", "Invalid email from service", failed(new InvalidEmail())),
  sign_in(failure_group, "request-lost", "Browser lost the request", failed(new RequestLost())),
  sign_in(failure_group, "not-approved", "Finish before approval", failed(new FinalizeNotApproved({ phase: "pending" }))),
  sign_in(failure_group, "expired-finalize", "Expired while finishing", failed(new FinalizeExpired())),
  sign_in(failure_group, "missing-secret", "Wrong browser", failed(new FinalizeMissingSecret())),
  sign_in(failure_group, "totp-required", "Authenticator code missing", failed(new FinalizeTotpRequired())),
  sign_in(providers_group, "google-redirecting", "Google redirecting", form(EmailField.Empty(), ProviderAction.Redirecting({ provider: "google" }))),
  sign_in(providers_group, "github-redirecting", "GitHub redirecting", form(EmailField.Empty(), ProviderAction.Redirecting({ provider: "github" }))),
  ...oauth_scenarios,
  approve(approve_group, "ready", "Ready to approve", Approval.Ready()),
  approve(approve_group, "approving", "Approving", Approval.Approving()),
  approve(approve_group, "missing-token", "Link missing its token", Approval.Ready(), { token: false }),
  approve(approve_group, "handed", "Original tab took over", Approval.Handed()),
  approve(approve_group, "other-device", "Started on another device", Approval.OtherDevice()),
  approve(approve_group, "expired", "Link expired", Approval.Expired()),
  approve(approve_group, "failed", "Approval failed", Approval.Failed({ message: friendly_error(api_failure(429, "rate limited")) })),
  approve(approve_group, "failed-unreachable", "Approval, service unreachable", Approval.Failed({ message: friendly_error(new TransportFailure()) })),
  approve(factor_group, "same-browser", "Continue here, no second factor", Approval.SameBrowser({ login: login(false) })),
  approve(factor_group, "totp", "Authenticator code", Approval.SameBrowser({ login: login(true) })),
  approve(factor_group, "recovery", "Recovery code", Approval.SameBrowser({ login: login(true) }), { use_recovery: true }),
  approve(
    factor_group,
    "totp-error",
    "Authenticator code missing",
    Approval.SameBrowser({ login: login(true) }),
    { finish: Flow.Approved({ login: login(true), error: Option.some(FinishProblem.Failed({ message: friendly_error(new FinalizeTotpRequired()) })) }) },
  ),
  approve(
    factor_group,
    "recovery-error",
    "Recovery code rejected",
    Approval.SameBrowser({ login: login(true) }),
    { use_recovery: true, finish: Flow.Approved({ login: login(true), error: Option.some(FinishProblem.CodeRejected()) }) },
  ),
  approve(
    finish_group,
    "finishing",
    "Finishing",
    Approval.SameBrowser({ login: login(false) }),
    { finish: Flow.Finishing({ login: login(false) }) },
  ),
  approve(
    finish_group,
    "finishing-totp",
    "Finishing with a code",
    Approval.SameBrowser({ login: login(true) }),
    { finish: Flow.Finishing({ login: login(true) }) },
  ),
  approve(
    finish_group,
    "finish-failed",
    "Finish failed",
    Approval.SameBrowser({ login: login(false) }),
    { finish: Flow.Approved({ login: login(false), error: Option.some(FinishProblem.Failed({ message: friendly_error(new TransportFailure()) })) }) },
  ),
  approve(
    finish_group,
    "signed-in",
    "Signed in, redirecting",
    Approval.SameBrowser({ login: login(false) }),
    { finish: Flow.SignedIn({ destination: "https://dashboard.artisan.st" }) },
  ),
];
