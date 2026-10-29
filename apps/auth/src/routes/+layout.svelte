<script lang="ts">
  import type { Snippet } from "svelte";
  import "@artisanstreet/ui/tokens.css";
  import "../app.css";

  let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
  <title>Sign In | Artisan Street</title>
  <meta name="description" content="Sign in to Artisan with an emailed link." />
</svelte:head>

{@render children()}
