<script lang="ts" effect>
  import { Effect, Option } from "effect";
  import { page } from "$app/state";
  import { replaceState } from "$app/navigation";
  import { VITE_DASHBOARD_URL } from "$app/env/public";
  import { Approval, approve, without_token } from "../../lib/sign-in/approve.ts";
  import { complete, Flow } from "../../lib/sign-in/flow.ts";
  import { FactorKind, finish_error_of } from "../../lib/sign-in/view.ts";
  import { second_factor } from "../../lib/sign-in/state.ts";
  import { dashboard_url } from "../../lib/return-to.ts";
  import { debug_scenes } from "../../lib/debug/scenes.svelte.ts";
  import AuthCard from "../../lib/shell/auth-card.svelte";
  import Field from "../../lib/shell/field.svelte";
  import Heading from "../../lib/shell/heading.svelte";
  import SandButton from "../../lib/shell/sand-button.svelte";
  import Well from "../../lib/shell/well.svelte";
  import FeedbackLabel from "../../lib/feedback/feedback.svelte";
  import { Feedback } from "../../lib/sign-in/view.ts";
  import { Scene } from "../../lib/sign-in/scenarios.ts";

  const token = Option.fromNullishOr(page.url.searchParams.get("token")).pipe(
    Option.filter((value) => value.length > 0),
  );
  const destination = dashboard_url(VITE_DASHBOARD_URL, page.url.searchParams.get("return_to"));

  let approval: Approval = $state(Approval.Ready());
  let finish: Flow = $state(Flow.Idle());
  let code = $state("");
  let use_recovery = $state(false);

  let debug_token: boolean | null = $state(null);

  $effect(() => {
    const scene = debug_scenes.current?.scene;
    Option.match(Option.fromNullishOr(scene).pipe(Option.filter(Scene.$is("Approve"))), {
      onNone: () => {
        debug_token = null;
        approval = Approval.Ready();
        finish = Flow.Idle();
        use_recovery = false;
      },
      onSome: (next) => {
        debug_token = next.token;
        approval = next.approval;
        finish = next.finish;
        use_recovery = next.use_recovery;
      },
    });
  });

  const has_token = $derived(debug_token ?? Option.isSome(token));

  const same_browser = $derived(
    Approval.$is("SameBrowser")(approval) ? Option.some(approval.login) : Option.none(),
  );
  const finishing = $derived(Flow.$is("Finishing")(finish));
  const kind = $derived(use_recovery ? FactorKind.Recovery() : FactorKind.Authenticator());
  const finish_feedback = $derived(
    Option.match(finish_error_of(finish, kind), {
      onNone: () => Feedback.None(),
      onSome: (message) => Feedback.Error({ message }),
    }),
  );

  const scrub_token = Effect.sync(() => replaceState(without_token(page.url), {}));

  const consume = (value: string) =>
    Effect.gen(function* () {
      approval = Approval.Approving();
      const result = yield* approve(value);
      approval = result;
      yield* Approval.$is("Failed")(result) ? Effect.void : scrub_token;
    });

  const Approve = Option.match(token, { onNone: () => Effect.void, onSome: consume });

  const emit = (next: Flow) =>
    Effect.sync(() => {
      finish = next;
      if (Flow.$is("SignedIn")(next)) window.location.assign(next.destination);
    });

  const Finish = Effect.suspend(() =>
    Option.match(same_browser, {
      onNone: () => Effect.void,
      onSome: (login) => complete(login, second_factor(use_recovery, code), destination, emit),
    }),
  );

  const toggle_recovery = () => {
    code = "";
    use_recovery = !use_recovery;
  };
</script>

<svelte:head>
  <title>Approve sign-in | Artisan Street</title>
</svelte:head>

<AuthCard>
  {#if Approval.$is("Ready")(approval) || Approval.$is("Approving")(approval)}
    {#if has_token}
      <Heading
        title="Approve this sign-in?"
        text="This signs in the browser that asked for the link. Only approve it if you just tried to sign in."
      />
      <SandButton type="button" disabled={Approval.$is("Approving")(approval)} onclick={yield* Approve}>
        {Approval.$is("Approving")(approval) ? "Approving…" : "Approve sign-in"}
      </SandButton>
    {:else}
      <Heading title="This link is incomplete" text="It's missing the part that approves the sign-in." />
      <Well>Open the full link from your email, or <a href="/">request a new one</a>.</Well>
    {/if}
  {:else if Approval.$is("Handed")(approval)}
    <Heading title="Approved" text="The tab that asked for this link is signing you in. You can close this one." />
  {:else if Approval.$is("SameBrowser")(approval)}
    <Heading title="Approved" text="The tab that asked for this link is closed, so finish signing in here." />
    {#if approval.login.totp_required}
      <form class="factor" method="dialog" novalidate onsubmit={yield* Finish}>
        <Field
          id="approve-code"
          label={use_recovery ? "Recovery code" : "Authenticator code"}
          spaced={!use_recovery}
          inputmode={use_recovery ? "text" : "numeric"}
          autocomplete={use_recovery ? "off" : "one-time-code"}
          aria-describedby="approve-feedback"
          busy={finishing}
          bind:value={code}
          placeholder={use_recovery ? "xxxx-xxxx-xxxx" : "123456"}
        />
        <FeedbackLabel feedback={finish_feedback} id="approve-feedback" />
      </form>
      <Well>
        {use_recovery ? "Have your authenticator?" : "Lost your authenticator?"}
        <button type="button" onclick={toggle_recovery}>
          {use_recovery ? "Use a code from it" : "Use a recovery code"}
        </button>
        instead.
      </Well>
    {:else}
      <SandButton type="button" disabled={finishing} onclick={yield* Finish}>
        {finishing ? "Finishing…" : "Continue here"}
      </SandButton>
      <FeedbackLabel feedback={finish_feedback} id="approve-feedback" />
    {/if}
  {:else if Approval.$is("OtherDevice")(approval)}
    <Heading title="Approved" text="Go back to the device you started on. It finishes signing in on its own." />
  {:else if Approval.$is("Expired")(approval)}
    <Heading title="This link has expired" text="Sign-in links only work for a few minutes." />
    <Well><a href="/">Request a new link</a> and open it straight away.</Well>
  {:else if Approval.$is("Failed")(approval)}
    <Heading title="Couldn't approve this sign-in" />
    <FeedbackLabel feedback={Feedback.Error({ message: approval.message })} id="approve-feedback" />
    <Well><a href="/">Back to sign-in</a></Well>
  {/if}
</AuthCard>

<style>
  .factor {
    display: flex;
    flex-direction: column;
  }
</style>
