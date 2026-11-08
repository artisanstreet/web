<script lang="ts">
  import { page } from "$app/state";
  import { DesktopDone, desktop_done_of, done_message } from "../../../../lib/auth/desktop/handoff.ts";
  import { Feedback } from "../../../../lib/auth/sign-in/view.ts";
  import FeedbackLabel from "../../../../lib/auth/feedback/feedback.svelte";
  import AuthCard from "../../../../lib/auth/shell/auth-card.svelte";
  import Heading from "../../../../lib/auth/shell/heading.svelte";

  const done = $derived(desktop_done_of(page.url));
</script>

<svelte:head>
  <title>Artisan Editor | Artisan Street</title>
</svelte:head>

<AuthCard>
  {#if DesktopDone.$is("Failed")(done)}
    <Heading title="Artisan Editor isn't signed in" />
    <FeedbackLabel feedback={Feedback.Error({ message: done_message(done.problem) })} id="desktop-feedback" />
  {:else}
    <Heading title="Signed in to Artisan Editor" text="You can close this tab and return to the app." />
  {/if}
</AuthCard>
