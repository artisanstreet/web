// Adapted from Helium Prism, GPL-3.0-only. See license.txt.
import { Data, Effect } from "effect";
import fragment_source from "./shaders/fragment.glsl?raw";
import vertex_source from "./shaders/vertex.glsl?raw";

class ShaderUnavailable extends Data.TaggedError("ShaderUnavailable")<{
  readonly message: string;
}> {}

const resource = <T>(acquire: () => T | null, release: (value: T) => void) =>
  Effect.acquireRelease(
    Effect.sync(acquire).pipe(
      Effect.flatMap((value) => value === null
        ? Effect.fail(new ShaderUnavailable({ message: "WebGL resource unavailable" }))
        : Effect.succeed(value)),
    ),
    (value) => Effect.sync(() => release(value)),
  );

const compile_shader = (gl: WebGL2RenderingContext, kind: number, source: string) => {
  const compilation = Effect.gen(function* () {
    const shader = yield* resource(() => gl.createShader(kind), (value) => gl.deleteShader(value));
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      return yield* Effect.fail(new ShaderUnavailable({ message: gl.getShaderInfoLog(shader) ?? "Shader compilation failed" }));
    }
    return shader;
  });
  return compilation;
};

const create_grain = () => {
  const data = new Uint8Array(180 * 180 * 4);
  const offsets = [[0, 0], [17, 3], [7, 29], [31, 11]] as const;
  let index = 0;
  for (let y = 0; y < 180; y++) {
    for (let x = 0; x < 180; x++) {
      for (const [offset_x, offset_y] of offsets) {
        const hash = Math.sin((x + offset_x) * 127.1 + (y + offset_y) * 311.7) * 43758.5;
        data[index++] = Math.round((hash - Math.floor(hash)) * 255);
      }
    }
  }
  return data;
};

const animate = (canvas: HTMLCanvasElement, gl: WebGL2RenderingContext, program: WebGLProgram, color_context: CanvasRenderingContext2D) => {
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const set_float = (name: string, value: number) => gl.uniform1f(uniform(name), value);
  const wave_uniform = uniform("u_wave_phase");
  const secondary_uniform = uniform("u_secondary_wave_phase");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const theme = matchMedia("(prefers-color-scheme: light)");
  let frame = 0;
  let previous_time: number | null = null;
  let wave_phase = 0;
  let secondary_phase = 0;
  let stripe_count = 1;

  const draw = (time: number) => {
    const delta = previous_time === null || motion.matches ? 0 : Math.min((time - previous_time) / 1000, 0.064);
    previous_time = time;
    wave_phase += delta * 0.42;
    secondary_phase += delta * 0.26;
    gl.uniform1f(wave_uniform, wave_phase);
    gl.uniform1f(secondary_uniform, secondary_phase);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, stripe_count);
    canvas.dataset.state = "ready";
    frame = motion.matches || document.hidden ? 0 : requestAnimationFrame(draw);
  };

  const refresh = () => {
    cancelAnimationFrame(frame);
    previous_time = null;
    draw(performance.now());
  };

  const update_colors = () => {
    const styles = getComputedStyle(canvas);
    for (const [name, token] of [
      ["u_start_color", "--pearl-base"],
      ["u_pearl_pink", "--pearl-pink"],
      ["u_pearl_lilac", "--pearl-lilac"],
    ] as const) {
      color_context.fillStyle = styles.getPropertyValue(token).trim();
      color_context.fillRect(0, 0, 1, 1);
      const pixel = color_context.getImageData(0, 0, 1, 1).data;
      gl.uniform3f(uniform(name), pixel[0]! / 255, pixel[1]! / 255, pixel[2]! / 255);
    }
    set_float("u_alpha", theme.matches ? 0.35 : 0.7);
    set_float("u_grain_luminance", theme.matches ? 220 : 144);
    set_float("u_grain_contrast", theme.matches ? 34 : 64);
    set_float("u_grain_saturation", theme.matches ? 8 : 32);
    refresh();
  };

  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    const minimum = Math.max(1, Math.ceil(width / 120));
    const maximum = Math.max(1, Math.floor(width / 64));
    stripe_count = Math.max(minimum, Math.min(maximum, Math.max(1, Math.round(width / 110))));
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    gl.viewport(0, 0, canvas.width, canvas.height);
    const stripe_width = canvas.width / stripe_count;
    const vertical_span = canvas.height * 1.7;
    gl.uniform2f(uniform("u_size"), canvas.width, canvas.height);
    set_float("u_stripe_max_index", stripe_count - 1);
    set_float("u_stripe_width", stripe_width);
    set_float("u_gradient_top", canvas.height * -0.35);
    set_float("u_gradient_vertical_span", vertical_span);
    set_float("u_inverse_gradient_denominator", 1 / (stripe_width ** 2 + vertical_span ** 2));
    refresh();
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  motion.addEventListener("change", refresh);
  theme.addEventListener("change", update_colors);
  document.addEventListener("visibilitychange", refresh);
  update_colors();
  resize();

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    motion.removeEventListener("change", refresh);
    theme.removeEventListener("change", update_colors);
    document.removeEventListener("visibilitychange", refresh);
  };
};

export const mount_shimmer = (canvas: HTMLCanvasElement) => {
  const initialization = Effect.gen(function* () {
    const context = yield* Effect.try({
      try: () => canvas.getContext("webgl2", { alpha: true, antialias: false, depth: false, stencil: false }),
      catch: () => new ShaderUnavailable({ message: "WebGL 2 unavailable" }),
    });
    if (context === null) return yield* Effect.fail(new ShaderUnavailable({ message: "WebGL 2 unavailable" }));
    const gl = context;
    const color_context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (color_context === null) return yield* Effect.fail(new ShaderUnavailable({ message: "Color conversion unavailable" }));
    const vertex = yield* compile_shader(gl, gl.VERTEX_SHADER, vertex_source);
    const fragment = yield* compile_shader(gl, gl.FRAGMENT_SHADER, fragment_source);
    const program = yield* resource(() => gl.createProgram(), (value) => gl.deleteProgram(value));
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return yield* Effect.fail(new ShaderUnavailable({ message: gl.getProgramInfoLog(program) ?? "Shader linking failed" }));
    }
    gl.useProgram(program);
    const vertices = yield* resource(() => gl.createVertexArray(), (value) => gl.deleteVertexArray(value));
    const buffer = yield* resource(() => gl.createBuffer(), (value) => gl.deleteBuffer(value));
    const texture = yield* resource(() => gl.createTexture(), (value) => gl.deleteTexture(value));
    gl.bindVertexArray(vertices);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, -1, 1, -1, 0, 1, 0, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 180, 180, 0, gl.RGBA, gl.UNSIGNED_BYTE, create_grain());
    gl.uniform1i(gl.getUniformLocation(program, "u_grain_noise"), 0);
    const floats = {
      u_inverse_dpr: 1,
      u_intro_active: 0,
      u_alpha: 1,
      u_intro_alpha: 1,
      u_gradient_band_width: 0.48,
      u_gradient_min_stop: 0.14,
      u_gradient_max_stop: 0.96,
      u_idle_stripe_phase: 0.74,
      u_idle_secondary_stripe_phase: 1.28,
      u_idle_primary_amplitude: 0.19,
      u_idle_secondary_amplitude: 0.055,
      u_grain_alpha: 0.15,
      u_grain_luminance: 128,
      u_grain_contrast: 40,
      u_grain_saturation: 8,
    };
    for (const [name, value] of Object.entries(floats)) gl.uniform1f(gl.getUniformLocation(program, name), value);
    gl.clearColor(0, 0, 0, 0);
    yield* Effect.acquireRelease(
      Effect.sync(() => animate(canvas, gl, program, color_context)),
      (dispose) => Effect.sync(dispose),
    );
    yield* Effect.never;
  });
  return Effect.scoped(initialization).pipe(
    Effect.catchAll(() => Effect.sync(() => { canvas.dataset.state = "fallback"; })),
  );
};
