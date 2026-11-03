import { Data, Match, Option, Schema } from "effect";
import { Email, InvalidEmail } from "@artisanstreet/core-client";
import { failure_message, FinishProblem, Flow } from "./flow.ts";
import { friendly_error } from "./messages.ts";
import { OauthProblem, type Provider } from "./oauth.ts";

export { OauthProblem, type Provider };


export type EmailProblem = Data.TaggedEnum<{
  Missing: {};
  Malformed: {};
}>;

export const EmailProblem = Data.taggedEnum<EmailProblem>();

export type EmailField = Data.TaggedEnum<{
  Empty: {};
  Filled: { readonly email: string };
  Invalid: { readonly email: string; readonly problem: EmailProblem };
}>;

export const EmailField = Data.taggedEnum<EmailField>();

const is_email = Schema.is(Email);

export const typed_email = (value: string): EmailField =>
  value.trim() === "" ? EmailField.Empty() : EmailField.Filled({ email: value.trim() });

export const checked_email = (value: string): EmailField => {
  const email = value.trim();
  return Match.value(email).pipe(
    Match.when("", () => EmailField.Invalid({ email, problem: EmailProblem.Missing() })),
    Match.when(is_email, () => EmailField.Filled({ email })),
    Match.orElse(() => EmailField.Invalid({ email, problem: EmailProblem.Malformed() })),
  );
};

export type ProviderAction = Data.TaggedEnum<{
  Ready: {};
  Redirecting: { readonly provider: Provider };
  Failed: { readonly provider: Provider; readonly problem: OauthProblem };
}>;

export const ProviderAction = Data.taggedEnum<ProviderAction>();

export type FactorKind = Data.TaggedEnum<{
  Authenticator: {};
  Recovery: {};
}>;

export const FactorKind = Data.taggedEnum<FactorKind>();

export type FactorStep = Data.TaggedEnum<{
  Entering: { readonly code: string };
  Verifying: { readonly code: string };
  Rejected: { readonly code: string; readonly message: string };
}>;

export const FactorStep = Data.taggedEnum<FactorStep>();

export type SignInView = Data.TaggedEnum<{
  Form: { readonly email: EmailField; readonly provider: ProviderAction };
  Sending: { readonly email: string };
  Waiting: { readonly email: string };
  Approved: { readonly email: string };
  SecondFactor: { readonly email: string; readonly kind: FactorKind; readonly step: FactorStep };
  Finishing: { readonly email: string };
  Expired: { readonly message: string };
  Failed: { readonly message: string };
  SignedIn: { readonly destination: string };
}>;

export const SignInView = Data.taggedEnum<SignInView>();

const message_of = (flow: Flow, fallback: string): string =>
  Option.getOrElse(failure_message(flow), () => fallback);

export interface FactorInput {
  readonly kind: FactorKind;
  readonly code: string;
}

const no_factor: FactorInput = { kind: FactorKind.Authenticator(), code: "" };

export const problem_message = (kind: FactorKind) =>
  FinishProblem.$match({
    CodeRejected: () => rejected_message(kind),
    Failed: ({ message }) => message,
  });

const entered_step = (error: Option.Option<FinishProblem>, factor: FactorInput): FactorStep =>
  Option.match(error, {
    onNone: () => FactorStep.Entering({ code: factor.code }),
    onSome: (problem) => FactorStep.Rejected({ code: factor.code, message: problem_message(factor.kind)(problem) }),
  });

export const view_of = (flow: Flow, field: EmailField, factor: FactorInput = no_factor): SignInView =>
  Flow.$match(flow, {
    Idle: () => SignInView.Form({ email: field, provider: ProviderAction.Ready() }),
    Redirecting: ({ provider }) => SignInView.Form({ email: field, provider: ProviderAction.Redirecting({ provider }) }),
    ProviderFailed: ({ provider, problem }) =>
      SignInView.Form({ email: field, provider: ProviderAction.Failed({ provider, problem }) }),
    Sending: () => SignInView.Sending({ email: EmailField.$is("Filled")(field) ? field.email : "" }),
    Waiting: ({ login }) => SignInView.Waiting({ email: login.email }),
    Approved: ({ login, error }) =>
      login.totp_required
        ? SignInView.SecondFactor({ email: login.email, kind: factor.kind, step: entered_step(error, factor) })
        : Option.match(error, {
            onNone: () => SignInView.Approved({ email: login.email }),
            onSome: (problem) => SignInView.Failed({ message: problem_message(factor.kind)(problem) }),
          }),
    Finishing: ({ login }) =>
      login.totp_required
        ? SignInView.SecondFactor({
            email: login.email,
            kind: factor.kind,
            step: FactorStep.Verifying({ code: factor.code }),
          })
        : SignInView.Finishing({ email: login.email }),
    Expired: () => SignInView.Expired({ message: message_of(flow, "") }),
    Failed: ({ message }) => SignInView.Failed({ message }),
    SignedIn: ({ destination }) => SignInView.SignedIn({ destination }),
  });

export const finish_error_of = (flow: Flow, kind: FactorKind): Option.Option<string> =>
  Flow.$is("Approved")(flow) ? Option.map(flow.error, problem_message(kind)) : failure_message(flow);

export type Feedback = Data.TaggedEnum<{
  None: {};
  Error: { readonly message: string };
  Success: { readonly message: string };
}>;

export const Feedback = Data.taggedEnum<Feedback>();

const email_problem_message = EmailProblem.$match({
  Missing: () => "Enter your email address and we'll send you a sign-in link.",
  Malformed: () => friendly_error(new InvalidEmail()),
});

const form_feedback = (email: EmailField): Feedback =>
  EmailField.$is("Invalid")(email)
    ? Feedback.Error({ message: email_problem_message(email.problem) })
    : Feedback.None();

export const feedback_of = SignInView.$match({
  Form: ({ email }) => form_feedback(email),
  Sending: () => Feedback.None(),
  Waiting: () => Feedback.Success({ message: "Check your email for the sign-in link." }),
  Approved: () => Feedback.Success({ message: "Approved. Finish signing in." }),
  SecondFactor: ({ step }) =>
    FactorStep.$match(step, {
      Entering: () => Feedback.None(),
      Verifying: () => Feedback.None(),
      Rejected: ({ message }) => Feedback.Error({ message }),
    }),
  Finishing: () => Feedback.None(),
  Expired: ({ message }) => Feedback.Error({ message }),
  Failed: ({ message }) => Feedback.Error({ message }),
  SignedIn: () => Feedback.Success({ message: "Signed in." }),
});

export const email_of = SignInView.$match({
  Form: ({ email }) => (EmailField.$is("Empty")(email) ? "" : email.email),
  Sending: ({ email }) => email,
  Waiting: ({ email }) => email,
  Approved: ({ email }) => email,
  SecondFactor: ({ email }) => email,
  Finishing: ({ email }) => email,
  Expired: () => "",
  Failed: () => "",
  SignedIn: () => "",
});

const provider_name: Record<Provider, string> = { google: "Google", github: "GitHub" };

const oauth_message = (provider: Provider, problem: OauthProblem): string =>
  OauthProblem.$match(problem, {
    Denied: () => `${provider_name[provider]} sign-in was cancelled. Press the button to try again.`,
    Unavailable: () => `${provider_name[provider]} didn't answer our sign-in request. Try again in a moment.`,
    NoVerifiedEmail: () =>
      `${provider_name[provider]} didn't share a verified email with us. Verify it there, then try again.`,
    EmailTaken: () => "That email already signs in another way. Use the emailed link instead.",
  });

export const provider_feedback_of = (view: SignInView, provider: Provider): Feedback =>
  SignInView.$is("Form")(view) &&
  ProviderAction.$is("Failed")(view.provider) &&
  view.provider.provider === provider
    ? Feedback.Error({ message: oauth_message(provider, view.provider.problem) })
    : Feedback.None();

export const oauth_failure = (provider: Provider, problem: OauthProblem): ProviderAction =>
  ProviderAction.Failed({ provider, problem });

export const tone_of = Feedback.$match({
  None: () => "none",
  Error: () => "error",
  Success: () => "success",
});

export const rejected_message = FactorKind.$match({
  Authenticator: () => "That code didn't match. Codes refresh every 30 seconds, so try the latest one.",
  Recovery: () => "That recovery code didn't work. Each one only works once, so try another.",
});

export const code_of = (view: SignInView): string =>
  SignInView.$is("SecondFactor")(view) ? view.step.code : "";

export type Page = Data.TaggedEnum<{
  Email: {};
  Code: {};
}>;

export const Page = Data.taggedEnum<Page>();

export const page_of = SignInView.$match({
  Form: () => Page.Email(),
  Sending: () => Page.Email(),
  Waiting: () => Page.Email(),
  Approved: () => Page.Email(),
  SecondFactor: () => Page.Code(),
  Finishing: () => Page.Email(),
  Expired: () => Page.Email(),
  Failed: () => Page.Email(),
  SignedIn: () => Page.Email(),
});

export const locked = SignInView.$match({
  Form: ({ provider }) => ProviderAction.$is("Redirecting")(provider),
  Sending: () => true,
  Waiting: () => true,
  Approved: () => true,
  SecondFactor: ({ step }) => FactorStep.$is("Verifying")(step),
  Finishing: () => true,
  Expired: () => false,
  Failed: () => false,
  SignedIn: () => true,
});
