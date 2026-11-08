<script lang="ts">
  import type { Snippet } from "svelte";
  import DebugPanel from "../../lib/auth/debug/panel.svelte";

  let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
  <title>Sign In | Artisan Street</title>
  <meta name="description" content="Sign in to Artisan with an emailed link." />
</svelte:head>

{#if import.meta.env.DEV}
  <DebugPanel />
{/if}

{@render children()}
