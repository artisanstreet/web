import { Effect, Schema } from "effect";
import { DefineEnvVars } from "svelte-effect-runtime/environment";
import { default_auth_url } from "./lib/origins.ts";

const origin = (fallback: string) =>
  Schema.String.pipe(Schema.withDecodingDefault(Effect.succeed(fallback)));

export const variables = DefineEnvVars({
  VITE_CORE_API_URL: {
    public: true,
    static: true,
    schema: origin("https://api.artisan.st"),
    description: "Origin of the account API.",
  },
  VITE_AUTH_URL: {
    public: true,
    static: true,
    schema: origin(default_auth_url),
    description: "Origin of the sign-in site users are sent to when signed out.",
  },
});
