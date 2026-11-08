<script lang="ts" effect>
  import { Effect, Option } from "effect";
  import { DesktopView, grant_desktop, incomplete_message, recall_handoff } from "../../../../lib/auth/desktop/handoff.ts";
  import { Feedback } from "../../../../lib/auth/sign-in/view.ts";
  import FeedbackLabel from "../../../../lib/auth/feedback/feedback.svelte";
  import AuthCard from "../../../../lib/auth/shell/auth-card.svelte";
  import Heading from "../../../../lib/auth/shell/heading.svelte";

  const grant = Effect.gen(function* () {
    const pending = yield* recall_handoff;
    return yield* Option.match(pending, {
      onNone: () => Effect.succeed(DesktopView.Incomplete()),
      onSome: (handoff) => grant_desktop(handoff).pipe(Effect.as(DesktopView.Granting())),
    });
  });

  let view: DesktopView = $state(DesktopView.Granting());
  view = yield* grant;
</script>

<svelte:head>
  <title>Signing in | Artisan Street</title>
</svelte:head>

<AuthCard>
  {#if DesktopView.$is("Incomplete")(view)}
    <Heading title="Couldn't sign in to Artisan Editor" />
    <FeedbackLabel feedback={Feedback.Error({ message: incomplete_message })} id="desktop-feedback" />
  {:else}
    <Heading title="Signing you in" text="Handing your sign-in to Artisan Editor." working />
  {/if}
</AuthCard>
