<script lang="ts">
  import { cells_between, frame_at, squeeze, total_ms } from "./scramble.ts";

  let {
    label,
    expanded,
    onclick,
  }: { label: string; expanded: boolean; onclick: () => void } = $props();

  const rest = ["AR", "TIS", "AN"] as const;
  const swap = ["TO", "GG", "LE"] as const;
  const rest_squeezed = ["AR", "TS", "AN"] as const;
  const line_heights = [0.71, 0.8, 0.7] as const;

  const leave_delay_ms = 120;

  let shown: ReadonlyArray<ReadonlyArray<string>> = $state(rest.map((row) => Array.from(row)));
  let frame = 0;
  let leaving = 0;
  let showing: "rest" | "swap" = "rest";

  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const play = (target: readonly string[], final: readonly string[]) => {
    cancelAnimationFrame(frame);
    const settled = final.map((row) => Array.from(row));
    if (reduced()) {
      shown = settled;
      return;
    }
    shown = squeeze(shown);
    const cells = cells_between(shown, target);
    const duration = total_ms(cells);
    const started = performance.now();
    const step = (now: number) => {
      const elapsed = now - started;
      shown = elapsed >= duration ? settled : frame_at(cells, elapsed);
      if (elapsed < duration) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };

  const enter = () => {
    clearTimeout(leaving);
    if (showing === "swap") return;
    showing = "swap";
    play(swap, swap);
  };

  const leave = () => {
    clearTimeout(leaving);
    leaving = window.setTimeout(() => {
      if (showing === "rest") return;
      showing = "rest";
      play(rest_squeezed, rest);
    }, leave_delay_ms);
  };

  $effect(() => () => {
    cancelAnimationFrame(frame);
    clearTimeout(leaving);
  });
</script>

<button
  type="button"
  class="wordmark"
  aria-label={label}
  aria-controls="sidebar"
  aria-expanded={expanded}
  {onclick}
  onpointerenter={enter}
  onpointerleave={leave}
  onfocus={enter}
  onblur={leave}
>
  {#each shown as row, index (index)}
    <span class="row" style:line-height={line_heights[index]} aria-hidden="true">
      {#each row as char, column (column)}
        <span class="cell">{char}</span>
      {/each}
    </span>
  {/each}
</button>

<style>
  .wordmark {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 1.45em;
    padding: 0;
    font-family: "Sigurd Variable", serif;
    font-size: 2.05rem;
    font-weight: 400;
    letter-spacing: -0.05em;
    color: var(--ink);
    cursor: pointer;
    background: none;
    border: 0;
    outline: none;
  }

  .row {
    display: flex;
    justify-content: center;
    white-space: nowrap;
  }
</style>
