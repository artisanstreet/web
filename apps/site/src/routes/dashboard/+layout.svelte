<script lang="ts" effect>
  import { Effect } from "effect";
  import { Session } from "../../lib/account/account.ts";
  import { load_session } from "../../lib/account/session.ts";
  import { profile_state } from "../../lib/account/profile-state.svelte.ts";
  import type { Snippet } from "svelte";
  import Sidebar from "../../lib/sidebar/sidebar.svelte";
  import SettingsDialog from "../../lib/settings/dialog.svelte";
  import { theme_name, theme_state } from "../../lib/theme/state.svelte.ts";

  let { children }: { children: Snippet } = $props();

  let session: Session = $state(Session.Loading());
  const load_current_session = (_revision: number) => load_session;
  session = yield* load_current_session(profile_state.revision);
  const retry = Effect.sync(() => window.location.reload());

  $effect(() => {
    const name = theme_name(theme_state.current);
    document.documentElement.dataset.theme = name;
    document.documentElement.style.colorScheme = name;
  });
</script>

<svelte:head>
  <title>Dashboard | Artisan Street</title>
  <meta name="description" content="Your Artisan Street account." />
</svelte:head>

{#if Session.$is("SignedIn")(session)}
<div class="shell">
  <Sidebar {session} />
  <div class="content">
    {@render children()}
  </div>
</div>
<SettingsDialog />
{:else if Session.$is("Unreachable")(session)}
  <div class="session-status" role="alert">
    <p>We couldn’t reach your account. Please try again.</p>
    <button onclick={yield* retry}>Try again</button>
  </div>
{/if}

<style>
  .session-status {
    display: grid;
    justify-items: center;
    align-content: center;
    min-height: 100dvh;
    gap: 16px;
  }

  .shell {
    display: flex;
    min-height: 100dvh;
  }

  .content {
    position: relative;
    flex: 1;
    min-width: 0;
  }
</style>
