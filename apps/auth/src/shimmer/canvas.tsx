import { Effect, Fiber } from "effect";
import { useEffect, useRef } from "react";
import { mount_shimmer } from "./renderer.ts";

export function GradientShimmer() {
  const canvas_ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvas_ref.current;
    if (canvas === null) return;
    let fiber = Effect.runFork(mount_shimmer(canvas));
    const on_lost = (event: Event) => {
      event.preventDefault();
      Effect.runFork(Fiber.interrupt(fiber));
      canvas.dataset.state = "fallback";
    };
    const on_restored = () => { fiber = Effect.runFork(mount_shimmer(canvas)); };
    canvas.addEventListener("webglcontextlost", on_lost);
    canvas.addEventListener("webglcontextrestored", on_restored);
    return () => {
      canvas.removeEventListener("webglcontextlost", on_lost);
      canvas.removeEventListener("webglcontextrestored", on_restored);
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, []);

  return <canvas ref={canvas_ref} className="home-shimmer" aria-hidden="true" />;
}
