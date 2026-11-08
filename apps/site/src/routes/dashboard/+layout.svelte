<script lang="ts">
  import type { Snippet } from "svelte";
  import Sidebar from "../../lib/sidebar/sidebar.svelte";
  import SettingsDialog from "../../lib/settings/dialog.svelte";
  import { theme_name, theme_state } from "../../lib/theme/state.svelte.ts";

  let { children }: { children: Snippet } = $props();

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

<div class="shell">
  <Sidebar />
  <div class="content">
    {@render children()}
  </div>
</div>
<SettingsDialog />

<style>
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
