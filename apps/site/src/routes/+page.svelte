<script lang="ts">
  import Horizon from "../lib/horizon/horizon.svelte";
</script>

<svelte:head>
  <title>Artisan Street</title>
  <meta name="description" content="Artisan Street." />
</svelte:head>

<main aria-label="Artisan Street">
  <Horizon />
  <span class="wordmark" role="img" aria-label="Artisan"></span>
</main>

<style>
  main {
    position: relative;
    height: 100dvh;
    background: oklch(0.173 0 0);
  }

  .wordmark {
    position: absolute;
    top: clamp(1.5rem, 3vw, 2rem);
    left: clamp(1.5rem, 3vw, 2rem);
    display: block;
    height: 6rem;
    aspect-ratio: 311 / 512;
    background: oklch(0.97 0 0);
    mask: url("../lib/assets/wordmark.svg") center / contain no-repeat;
  }
</style>
