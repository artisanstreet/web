import { Effect, Option } from "effect";

const memory = new Map<string, string>();

const key = (request_id: string) => `artisan.auth.request_secret:${request_id}`;

export const store_secret = (request_id: string, secret: string): Effect.Effect<void> =>
  Effect.try({
    try: () => sessionStorage.setItem(key(request_id), secret),
    catch: () => "unavailable",
  }).pipe(Effect.catch(() => Effect.sync(() => void memory.set(request_id, secret))));

export const load_secret = (request_id: string): Effect.Effect<Option.Option<string>> =>
  Effect.try({
    try: () => Option.fromNullishOr(sessionStorage.getItem(key(request_id))),
    catch: () => "unavailable",
  }).pipe(
    Effect.catch(() => Effect.succeed(Option.none<string>())),
    Effect.map(Option.orElse(() => Option.fromNullishOr(memory.get(request_id)))),
  );

export const clear_secret = (request_id: string): Effect.Effect<void> =>
  Effect.try({
    try: () => sessionStorage.removeItem(key(request_id)),
    catch: () => "unavailable",
  }).pipe(
    Effect.ignore,
    Effect.andThen(Effect.sync(() => void memory.delete(request_id))),
  );
