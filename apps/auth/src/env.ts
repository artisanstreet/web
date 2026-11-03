import { Effect, Schema } from "effect";
import { DefineEnvVars } from "svelte-effect-runtime/environment";
import { default_dashboard_url } from "./lib/origins.ts";

const origin = (fallback: string) =>
  Schema.String.pipe(Schema.withDecodingDefault(Effect.succeed(fallback)));

export const variables = DefineEnvVars({
  VITE_CORE_API_URL: {
    public: true,
    static: true,
    schema: origin("https://api.artisan.st"),
    description: "Origin of the account API.",
  },
  VITE_DASHBOARD_URL: {
    public: true,
    static: true,
    schema: origin(default_dashboard_url),
    description: "Origin of the dashboard users land on after signing in.",
  },
});
