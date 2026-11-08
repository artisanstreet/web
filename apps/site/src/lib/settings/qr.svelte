<script lang="ts">
  let { cells }: { cells: ReadonlyArray<ReadonlyArray<boolean>> } = $props();

  const size = $derived(cells.length);
  const path = $derived(
    cells.flatMap((line, y) => line.flatMap((on, x) => (on ? [`M${x} ${y}h1v1h-1z`] : []))).join(""),
  );
</script>

<div class="qr">
  <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Authenticator setup code" shape-rendering="crispEdges">
    <path d={path} />
  </svg>
</div>

<style>
  .qr {
    flex: none;
    width: 10rem;
    height: 10rem;
    padding: var(--sp-3);
    background: oklch(0.98 0.005 85);
    border-radius: calc(var(--radius-md) - 6px);
    box-shadow: var(--shadow-rest);
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  path {
    fill: oklch(0.2 0.01 70);
  }
</style>
