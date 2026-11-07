<script lang="ts">
  import { Match, Option } from "effect";
  import { constrain_framing, crop_bounds, move_framing, type Framing, type ImageSize } from "./avatar-crop.ts";
  import Button from "./button.svelte";

  let { image, framing = $bindable(), disabled = false }: {
    image: ImageSize & { readonly url: string };
    framing: Framing;
    disabled?: boolean;
  } = $props();

  const bounds = $derived(crop_bounds(image, framing));
  let drag = Option.none<{ readonly id: number; readonly x: number; readonly y: number }>();

  const start_drag = (event: PointerEvent & { currentTarget: HTMLButtonElement }) => {
    if (event.button !== 0 || Option.isSome(drag)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag = Option.some({ id: event.pointerId, x: event.clientX, y: event.clientY });
  };

  const move_drag = (event: PointerEvent & { currentTarget: HTMLButtonElement }) => {
    if (disabled || Option.isNone(drag) || drag.value.id !== event.pointerId) return;
    const width = event.currentTarget.getBoundingClientRect().width;
    framing = move_framing(image, framing, (event.clientX - drag.value.x) / width, (event.clientY - drag.value.y) / width);
    drag = Option.some({ id: event.pointerId, x: event.clientX, y: event.clientY });
  };

  const end_drag = () => { drag = Option.none(); };

  const move_key = (event: KeyboardEvent) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    const delta = Match.value(event.key).pipe(
      Match.when("ArrowLeft", () => Option.some({ x: -step, y: 0 })),
      Match.when("ArrowRight", () => Option.some({ x: step, y: 0 })),
      Match.when("ArrowUp", () => Option.some({ x: 0, y: -step })),
      Match.when("ArrowDown", () => Option.some({ x: 0, y: step })),
      Match.orElse(() => Option.none()),
    );
    if (Option.isNone(delta)) return;
    event.preventDefault();
    framing = move_framing(image, framing, delta.value.x, delta.value.y);
  };
</script>

<div class="crop-editor">
  <button type="button" class="crop-viewport" {disabled} aria-label="Move avatar image" aria-describedby="avatar-crop-help" onpointerdown={start_drag} onpointermove={move_drag} onpointerup={end_drag} onpointercancel={end_drag} onlostpointercapture={end_drag} onkeydown={move_key}>
    <img src={image.url} alt="" draggable="false" style:width={`${image.width / bounds.size * 100}%`} style:height={`${image.height / bounds.size * 100}%`} style:left={`${-bounds.x / bounds.size * 100}%`} style:top={`${-bounds.y / bounds.size * 100}%`} />
    <span class="crop-grid" aria-hidden="true"></span>
  </button>
  <p id="avatar-crop-help">Drag to reposition, or use the arrow keys.</p>
  <div class="zoom-control">
    <label for="avatar-zoom">Zoom</label>
    <input id="avatar-zoom" type="range" min="1" max="3" step="0.01" value={framing.zoom} {disabled} oninput={(event) => { framing = constrain_framing(image, { ...framing, zoom: event.currentTarget.valueAsNumber }); }} />
    <Button {disabled} onclick={() => { framing = { x: 0.5, y: 0.5, zoom: 1 }; }}>Reset</Button>
  </div>
</div>

<style>
  .crop-editor { display: flex; flex-direction: column; align-items: center; gap: var(--sp-3); width: min(100%, 20rem); align-self: center; }
  .crop-viewport { position: relative; display: block; width: 100%; aspect-ratio: 1; padding: 0; overflow: hidden; border: 1px solid var(--ink-dim); border-radius: var(--radius-sm); background: oklch(1 0 0); cursor: grab; touch-action: none; }
  .crop-viewport:active { cursor: grabbing; }
  .crop-viewport:disabled { cursor: default; }
  .crop-viewport:focus-visible, input:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }
  img { position: absolute; max-width: none; pointer-events: none; user-select: none; }
  .crop-grid { position: absolute; inset: 0; pointer-events: none; background-image: linear-gradient(to right, oklch(1 0 0 / 0.5) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.5) 1px, transparent 1px); background-size: calc(100% / 3) calc(100% / 3); }
  p { margin: 0; color: var(--ink-dim); font-size: 0.8125rem; line-height: 1.2rem; text-align: center; }
  .zoom-control { display: flex; align-items: center; gap: var(--sp-3); width: 100%; color: var(--ink); font-size: 0.875rem; }
  input { flex: 1; min-width: 0; min-height: 2.75rem; margin: 0; accent-color: var(--ink); }
</style>
