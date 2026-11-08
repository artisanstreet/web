<script lang="ts">
  import type { Snippet } from "svelte";
  import "@artisanstreet/ui/tokens.css";
  import "@artisanstreet/ui/surfaces.css";
  import "../app.css";

  let { children }: { children: Snippet } = $props();

  const set_modality = (modality: "keyboard" | "pointer") => () => {
    document.documentElement.dataset.modality = modality;
  };
</script>

<svelte:window onkeydown={set_modality("keyboard")} onpointerdown={set_modality("pointer")} />

{@render children()}
