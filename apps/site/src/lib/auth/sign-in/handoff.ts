import { Context, Data, Effect, Layer, Option, PubSub, Schema, Scope, Stream } from "effect";

export const Handoff = Schema.TaggedUnion({
  Approved: { request_id: Schema.String },
  Present: { request_id: Schema.String },
});

export type Handoff = typeof Handoff.Type;

export const decode_handoff = Schema.decodeUnknownOption(Handoff);

export const approved_for =
  (request_id: string) =>
  (message: Handoff): boolean =>
    Handoff.guards.Approved(message) && message.request_id === request_id;

export const present_for =
  (request_id: string) =>
  (message: Handoff): boolean =>
    Handoff.guards.Present(message) && message.request_id === request_id;

const channel_name = "artisan.auth.sign-in";

class ChannelUnavailable extends Data.TaggedError("ChannelUnavailable") {}

export class HandoffChannel extends Context.Service<
  HandoffChannel,
  {
    readonly post: (message: Handoff) => Effect.Effect<void>;
    readonly subscribe: Effect.Effect<PubSub.Subscription<Handoff>, never, Scope.Scope>;
  }
>()("auth/HandoffChannel") {
  static readonly layer = Layer.effect(
    HandoffChannel,
    Effect.gen(function* () {
      const pubsub = yield* PubSub.unbounded<Handoff>();
      const channel = yield* Effect.acquireRelease(
        Effect.try({ try: () => new BroadcastChannel(channel_name), catch: () => new ChannelUnavailable() }),
        (opened) => Effect.sync(() => opened.close()),
      ).pipe(Effect.option);
      yield* Option.match(channel, {
        onNone: () => Effect.void,
        onSome: (opened) =>
          Stream.fromEventListener<MessageEvent>(opened, "message").pipe(
            Stream.map((event) => decode_handoff(event.data)),
            Stream.filter(Option.isSome),
            Stream.runForEach((message) => PubSub.publish(pubsub, message.value)),
            Effect.forkScoped,
          ),
      });
      return {
        post: (message: Handoff) =>
          Option.match(channel, {
            onNone: () => Effect.void,
            onSome: (opened) => Effect.try(() => opened.postMessage(message)).pipe(Effect.ignore),
          }),
        subscribe: PubSub.subscribe(pubsub),
      };
    }),
  );
}
