import { Data, Effect, Match, Option } from "effect";
import { fragment_source } from "./fragment.ts";

class ShaderUnavailable extends Data.TaggedError("ShaderUnavailable")<{
  readonly reason: string;
}> {}

const required = <A>(value: A | null, reason: string) =>
  Effect.fromOption(Option.fromNullishOr(value), () => new ShaderUnavailable({ reason }));

const vertex_source = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = vec2(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5);
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const compile = (gl: WebGLRenderingContext, kind: number, source: string) =>
  Effect.gen(function* () {
    const shader = yield* Effect.acquireRelease(
      Effect.gen(function* () {
        return yield* required(yield* Effect.sync(() => gl.createShader(kind)), "Could not allocate shader");
      }),
      (shader) => Effect.sync(() => gl.deleteShader(shader)),
    );
    yield* Effect.sync(() => gl.shaderSource(shader, source));
    yield* Effect.sync(() => gl.compileShader(shader));
    yield* Effect.filterOrFail(
      Effect.sync(() => gl.getShaderParameter(shader, gl.COMPILE_STATUS) === true),
      Boolean,
      () => new ShaderUnavailable({ reason: gl.getShaderInfoLog(shader) ?? "Could not compile shader" }),
    );
    return shader;
  });

const next_frame = Effect.callback<number>((resume) => {
  const frame = requestAnimationFrame((time) => resume(Effect.succeed(time)));
  return Effect.sync(() => cancelAnimationFrame(frame));
});

export const mount_horizon = (canvas: HTMLCanvasElement) =>
  Effect.gen(function* () {
    const gl = yield* required(
      yield* Effect.sync(() => canvas.getContext("webgl", { alpha: false, antialias: false, depth: false })),
      "WebGL is unavailable",
    );
    const vertex = yield* compile(gl, gl.VERTEX_SHADER, vertex_source);
    const fragment = yield* compile(gl, gl.FRAGMENT_SHADER, fragment_source);
    const program = yield* Effect.acquireRelease(
      Effect.gen(function* () {
        return yield* required(yield* Effect.sync(() => gl.createProgram()), "Could not allocate program");
      }),
      (program) => Effect.gen(function* () {
        yield* Effect.sync(() => gl.useProgram(null));
        yield* Effect.sync(() => gl.deleteProgram(program));
      }),
    );
    yield* Effect.sync(() => gl.attachShader(program, vertex));
    yield* Effect.sync(() => gl.attachShader(program, fragment));
    yield* Effect.sync(() => gl.linkProgram(program));
    yield* Effect.filterOrFail(
      Effect.sync(() => gl.getProgramParameter(program, gl.LINK_STATUS) === true),
      Boolean,
      () => new ShaderUnavailable({ reason: gl.getProgramInfoLog(program) ?? "Could not link program" }),
    );
    const buffer = yield* Effect.acquireRelease(
      Effect.gen(function* () {
        return yield* required(yield* Effect.sync(() => gl.createBuffer()), "Could not allocate vertices");
      }),
      (buffer) => Effect.sync(() => gl.deleteBuffer(buffer)),
    );
    yield* Effect.sync(() => gl.useProgram(program));
    yield* Effect.sync(() => gl.bindBuffer(gl.ARRAY_BUFFER, buffer));
    yield* Effect.sync(() => gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW));
    const position = yield* Effect.sync(() => gl.getAttribLocation(program, "position"));
    yield* Effect.sync(() => gl.enableVertexAttribArray(position));
    yield* Effect.sync(() => gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0));
    const resolution = yield* Effect.sync(() => gl.getUniformLocation(program, "resolution"));
    const elapsed = yield* Effect.sync(() => gl.getUniformLocation(program, "elapsed"));
    const horizon = yield* Effect.sync(() => gl.getUniformLocation(program, "horizon"));
    const motion = yield* Effect.sync(() => matchMedia("(prefers-reduced-motion: reduce)"));
    const started = yield* Effect.sync(() => performance.now());
    const draw = (time: number) => Effect.gen(function* () {
      const ratio = yield* Effect.sync(() => Math.min(devicePixelRatio, 2));
      const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      yield* Match.value(canvas.width !== width || canvas.height !== height).pipe(
        Match.when(true, () => Effect.sync(() => { canvas.width = width; canvas.height = height; })),
        Match.orElse(() => Effect.void),
      );
      yield* Effect.sync(() => gl.viewport(0, 0, width, height));
      yield* Effect.sync(() => gl.uniform2f(resolution, width, height));
      yield* Effect.sync(() => gl.uniform1f(elapsed, motion.matches ? 0 : (time - started) / 1000));
      yield* Effect.sync(() => gl.uniform1f(horizon, 0.48));
      yield* Effect.sync(() => gl.drawArrays(gl.TRIANGLES, 0, 3));
    });
    yield* draw(started);
    yield* Effect.forkScoped(Effect.gen(function* () {
      const time = yield* motion.matches
        ? Effect.gen(function* () { yield* Effect.sleep("250 millis"); return yield* Effect.sync(() => performance.now()); })
        : next_frame;
      yield* draw(time);
    }).pipe(Effect.forever));
  });
