<script lang="ts" effect>
  import { Effect } from "effect";
  import { page } from "$app/state";
  import {
    DesktopRequest,
    DesktopView,
    desktop_request_of,
    incomplete_message,
    start_desktop,
  } from "../../lib/desktop/handoff.ts";
  import { provider_names } from "../../lib/sign-in/oauth.ts";
  import { Feedback } from "../../lib/sign-in/view.ts";
  import FeedbackLabel from "../../lib/feedback/feedback.svelte";
  import AuthCard from "../../lib/shell/auth-card.svelte";
  import Heading from "../../lib/shell/heading.svelte";
  import Well from "../../lib/shell/well.svelte";

  const request = desktop_request_of(page.url);
  const destination = `${page.url.origin}/desktop/grant`;

  const shown = DesktopRequest.$match(request, {
    Valid: ({ provider }) => DesktopView.Connecting({ provider }),
    Invalid: () => DesktopView.Incomplete(),
  });

  const begin = DesktopRequest.$match(request, {
    Valid: ({ provider, handoff }) => start_desktop(provider, handoff, destination).pipe(Effect.as(shown)),
    Invalid: () => Effect.succeed(shown),
  });

  let view: DesktopView = $state(shown);
  view = yield* begin;
</script>

<svelte:head>
  <title>Sign in to Artisan Editor | Artisan Street</title>
</svelte:head>

<AuthCard>
  {#if DesktopView.$is("Connecting")(view)}
    <Heading
      title="Connecting to {provider_names[view.provider]}"
      text="You'll sign in with {provider_names[view.provider]}, then head back to Artisan Editor."
      working
    />
  {:else}
    <Heading title="Couldn't sign in to Artisan Editor" />
    <FeedbackLabel feedback={Feedback.Error({ message: incomplete_message })} id="desktop-feedback" />
  {/if}
</AuthCard>
