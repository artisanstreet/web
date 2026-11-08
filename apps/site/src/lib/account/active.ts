import { Data, Effect, Option, Schema } from "effect";

const Remembered = Schema.Struct({
  active: Schema.String,
  known: Schema.Array(Schema.String),
});

export type Remembered = typeof Remembered.Type;

const storage_key = "artisan.account";

const decode = Schema.decodeUnknownOption(Schema.fromJsonString(Remembered));

class StorageBlocked extends Data.TaggedError("StorageBlocked") {}

export const remembered = Effect.try({
  try: () => localStorage.getItem(storage_key),
  catch: () => new StorageBlocked(),
}).pipe(
  Effect.map((raw) => Option.flatMap(Option.fromNullishOr(raw), decode)),
  Effect.catch(() => Effect.succeed(Option.none<Remembered>())),
);

export const remember = (state: Remembered) =>
  Effect.try({
    try: () => localStorage.setItem(storage_key, JSON.stringify(state)),
    catch: () => new StorageBlocked(),
  }).pipe(Effect.ignore);

export const active_account = Effect.map(remembered, Option.map((state) => state.active));

export const next_active = (previous: Option.Option<Remembered>, signed_in: ReadonlyArray<string>): Option.Option<string> => {
  const known: ReadonlyArray<string> = Option.match(previous, { onNone: () => [], onSome: (state) => state.known });
  const added = signed_in.find((id) => !known.includes(id));
  const kept = previous.pipe(
    Option.map((state) => state.active),
    Option.filter((id) => signed_in.includes(id)),
  );
  return Option.orElse(Option.fromNullishOr(added), () => Option.orElse(kept, () => Option.fromNullishOr(signed_in[0])));
};
