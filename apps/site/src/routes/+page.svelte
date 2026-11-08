<script lang="ts">
  import Horizon from "../lib/horizon/horizon.svelte";
</script>

<svelte:head>
  <title>Artisan Street</title>
  <meta name="description" content="Artisan Street." />
</svelte:head>

<main aria-label="Artisan Street">
  <Horizon />
</main>

<style>
  main {
    height: 100dvh;
    background: oklch(0.173 0 0);
  }
</style>
