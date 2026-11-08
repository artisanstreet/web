<script lang="ts" effect>
  import { Effect, Option } from "effect";
  import { mount_horizon } from "./renderer.ts";

  let canvas = $state<HTMLCanvasElement>();

  yield* Option.match(Option.fromNullishOr(canvas), {
    onNone: () => Effect.void,
    onSome: (element) => mount_horizon(element).pipe(
      Effect.catchTag("ShaderUnavailable", () => Effect.void),
    ),
  });
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    background: oklch(0.173 0 0);
  }
</style>
