<script lang="ts" effect>
  import { Effect, Option } from "effect";
  import { page } from "$app/state";
  import { dashboard_url } from "../../../lib/auth/return-to.ts";
  import { friendly_error } from "../../../lib/auth/sign-in/messages.ts";
  import { account_of, link_provider, LinkView, provider_names, provider_of } from "../../../lib/auth/sign-in/oauth.ts";
  import { Feedback } from "../../../lib/auth/sign-in/view.ts";
  import FeedbackLabel from "../../../lib/auth/feedback/feedback.svelte";
  import AuthCard from "../../../lib/auth/shell/auth-card.svelte";
  import Heading from "../../../lib/auth/shell/heading.svelte";
  import Well from "../../../lib/auth/shell/well.svelte";

  const destination = dashboard_url(page.url.origin, page.url.searchParams.get("return_to"));

  const requested = provider_of(page.url);
  const unsupported = LinkView.Failed({ message: "That sign-in method isn't one we support." });

  const link = Option.match(requested, {
    onNone: () => Effect.succeed(unsupported),
    onSome: (provider) =>
      link_provider(provider, account_of(page.url), destination).pipe(
        Effect.as(LinkView.Working({ provider })),
        Effect.catchTag("FlowLost", () =>
          Effect.succeed(LinkView.Failed({ message: "This browser wouldn't let us remember the request. Try again." })),
        ),
        Effect.catch((failure) => Effect.succeed(LinkView.Failed({ message: friendly_error(failure) }))),
      ),
  });

  let view: LinkView = $state(
    Option.match(requested, { onNone: () => unsupported, onSome: (provider) => LinkView.Working({ provider }) }),
  );
  view = yield* link;
</script>

<svelte:head>
  <title>Connect account | Artisan Street</title>
</svelte:head>

<AuthCard>
  {#if LinkView.$is("Working")(view)}
    <Heading
      title="Connecting to {provider_names[view.provider]}"
      text="You'll approve it on {provider_names[view.provider]}, then land back in your settings."
      working
    />
  {:else}
    <Heading title="Couldn't connect that account" />
    <FeedbackLabel feedback={Feedback.Error({ message: view.message })} id="link-feedback" />
    <Well><a href={destination}>Back to settings</a></Well>
  {/if}
</AuthCard>
