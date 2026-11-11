import { Effect, Schema } from "effect";
import { DefineEnvVars } from "svelte-effect-runtime/environment";

const origin = (fallback: string) =>
  Schema.String.pipe(Schema.withDecodingDefault(Effect.succeed(fallback)));

export const variables = DefineEnvVars({
  SITE_PUBLIC_ORIGIN: {
    schema: origin(process.env.PORTLESS_URL ?? "https://artisan.st"),
    description: "Canonical origin of the unified website.",
  },
  VITE_CORE_API_URL: {
    public: true,
    static: true,
    schema: origin("https://api.artisan.st"),
    description: "Origin of the account API.",
  },
});
