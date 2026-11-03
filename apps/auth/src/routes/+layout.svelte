<script lang="ts">
  import type { Snippet } from "svelte";
  import "@artisanstreet/ui/tokens.css";
  import "@artisanstreet/ui/surfaces.css";
  import "../app.css";
  import DebugPanel from "../lib/debug/panel.svelte";

  let { children }: { children: Snippet } = $props();

  const set_modality = (modality: "keyboard" | "pointer") => () => {
    document.documentElement.dataset.modality = modality;
  };
</script>

<svelte:window onkeydown={set_modality("keyboard")} onpointerdown={set_modality("pointer")} />

<svelte:head>
  <title>Sign In | Artisan Street</title>
  <meta name="description" content="Sign in to Artisan with an emailed link." />
</svelte:head>

{#if import.meta.env.DEV}
  <DebugPanel />
{/if}

{@render children()}
