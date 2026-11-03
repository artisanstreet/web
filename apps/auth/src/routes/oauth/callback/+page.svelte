<script lang="ts" effect>
  import { Effect, Option } from "effect";
  import { page } from "$app/state";
  import type { CoreFailure } from "@artisanstreet/core-client";
  import { friendly_error } from "../../../lib/sign-in/messages.ts";
  import { second_factor } from "../../../lib/sign-in/state.ts";
  import { FactorKind, Feedback, rejected_message } from "../../../lib/sign-in/view.ts";
  import {
    Callback,
    exchange,
    finish_second_factor,
    finish_signup,
    FlowLost,
    Landing,
    leave_for,
    OauthProblem,
    provider_names,
    provider_return_of,
    ProviderReturn,
    recall,
    sign_in_url_with,
    type PendingFlow,
    type Profile,
  } from "../../../lib/sign-in/oauth.ts";
  import FeedbackLabel from "../../../lib/feedback/feedback.svelte";
  import AuthCard from "../../../lib/shell/auth-card.svelte";
  import Field from "../../../lib/shell/field.svelte";
  import Heading from "../../../lib/shell/heading.svelte";
  import Well from "../../../lib/shell/well.svelte";

  let code = $state("");
  let use_recovery = $state(false);
  let name = $state("");

  const kind = $derived(use_recovery ? FactorKind.Recovery() : FactorKind.Authenticator());

  const left = (destination: string) => leave_for(destination).pipe(Effect.as(Callback.Working()));

  const land = (pending: PendingFlow) =>
    Landing.$match({
      Enter: ({ destination }) => left(destination),
      Back: ({ problem }) => left(sign_in_url_with(pending.provider, problem)),
      SecondFactor: () =>
        Effect.succeed(Callback.SecondFactor({ pending, error: Option.none(), verifying: false })),
      Signup: ({ profile }) =>
        Effect.sync(() => {
          name = profile.display_name;
          return Callback.Signup({ pending, profile, error: Option.none(), creating: false });
        }),
    });

  const arrive = Effect.gen(function* () {
    const pending = yield* recall;
    return yield* ProviderReturn.$match(provider_return_of(page.url), {
      Code: ({ code, state }) => exchange(pending, code, state).pipe(Effect.flatMap(land(pending))),
      Refused: () => left(sign_in_url_with(pending.provider, OauthProblem.Denied())),
      Malformed: () => Effect.fail(new FlowLost()),
    });
  }).pipe(
    Effect.catchTag("FlowLost", () => Effect.succeed(Callback.Lost())),
    Effect.catch((failure) => Effect.succeed(Callback.Failed({ message: friendly_error(failure) }))),
  );

  let view: Callback = $state(Callback.Working());
  view = yield* arrive;

  const code_problem = (failure: CoreFailure) =>
    failure._tag === "ApiFailure" && failure.status === 403 ? rejected_message(kind) : friendly_error(failure);

  const verify = (pending: PendingFlow) =>
    Effect.gen(function* () {
      view = Callback.SecondFactor({ pending, error: Option.none(), verifying: true });
      yield* finish_second_factor(pending, second_factor(use_recovery, code));
    }).pipe(
      Effect.catch((failure) =>
        Effect.sync(() => {
          view = Callback.SecondFactor({ pending, error: Option.some(code_problem(failure)), verifying: false });
        }),
      ),
    );

  const create = (pending: PendingFlow, profile: Profile) =>
    Effect.gen(function* () {
      view = Callback.Signup({ pending, profile, error: Option.none(), creating: true });
      yield* finish_signup(pending, name);
    }).pipe(
      Effect.catch((failure) =>
        Effect.sync(() => {
          view = Callback.Signup({ pending, profile, error: Option.some(friendly_error(failure)), creating: false });
        }),
      ),
    );

  const submit_code = Effect.suspend(() =>
    Callback.$is("SecondFactor")(view) && !view.verifying ? verify(view.pending) : Effect.void,
  );

  const submit_signup = Effect.suspend(() =>
    Callback.$is("Signup")(view) && !view.creating ? create(view.pending, view.profile) : Effect.void,
  );

  const feedback_of = (error: Option.Option<string>) =>
    Option.match(error, { onNone: () => Feedback.None(), onSome: (message) => Feedback.Error({ message }) });

  const toggle_recovery = () => {
    code = "";
    use_recovery = !use_recovery;
  };
</script>

<svelte:head>
  <title>Signing in | Artisan Street</title>
</svelte:head>

<AuthCard>
  {#if Callback.$is("Working")(view)}
    <Heading title="Signing you in" text="Finishing up with your provider." working />
  {:else if Callback.$is("SecondFactor")(view)}
    <Heading
      title="Two-step verification"
      text={use_recovery
        ? "Enter one of your saved recovery codes."
        : "Enter the 6-digit code from your authenticator app."}
    />
    <form class="fields" method="dialog" novalidate onsubmit={yield* submit_code}>
      <Field
        id="callback-code"
        label={use_recovery ? "Recovery code" : "Authenticator code"}
        spaced={!use_recovery}
        inputmode={use_recovery ? "text" : "numeric"}
        autocomplete={use_recovery ? "off" : "one-time-code"}
        placeholder={use_recovery ? "xxxx-xxxx-xxxx" : "123456"}
        aria-describedby="callback-feedback"
        busy={view.verifying}
        bind:value={code}
      />
      <FeedbackLabel feedback={feedback_of(view.error)} id="callback-feedback" />
    </form>
    <Well>
      {use_recovery ? "Have your authenticator?" : "Lost your authenticator?"}
      <button type="button" onclick={toggle_recovery}>
        {use_recovery ? "Use a code from it" : "Use a recovery code"}
      </button>
      instead.
    </Well>
  {:else if Callback.$is("Signup")(view)}
    {@const avatar = view.profile.avatar_url}
    <Heading
      title="Create your account"
      text="Signing up with {provider_names[view.pending.provider]} as {view.profile.email}. What should we call you?"
    >
      {#snippet leading()}
        {#if avatar !== null}
          <img class="avatar" src={avatar} alt="" width="44" height="44" />
        {/if}
      {/snippet}
    </Heading>
    <form class="fields" method="dialog" novalidate onsubmit={yield* submit_signup}>
      <Field
        id="callback-name"
        label="Name"
        autocomplete="name"
        maxlength={120}
        placeholder="Your name"
        aria-describedby="callback-feedback"
        busy={view.creating}
        bind:value={name}
      />
      <FeedbackLabel feedback={feedback_of(view.error)} id="callback-feedback" />
    </form>
  {:else if Callback.$is("Lost")(view)}
    <Heading
      title="This sign-in can't finish here"
      text="This tab didn't start the sign-in, or it already finished."
    />
    <Well><a href="/">Start again</a> from the sign-in page.</Well>
  {:else if Callback.$is("Failed")(view)}
    <Heading title="Sign-in didn't finish" />
    <FeedbackLabel feedback={Feedback.Error({ message: view.message })} id="callback-feedback" />
    <Well><a href="/">Back to sign-in</a></Well>
  {/if}
</AuthCard>

<style>
  .fields {
    display: flex;
    flex-direction: column;
  }

  .avatar {
    flex: none;
    border-radius: var(--field-radius);
    box-shadow: var(--shadow-inset);
  }
</style>
