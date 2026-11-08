import * as Alchemy from "alchemy";
import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Effect from "effect/Effect";
import { stack_name, normalize_origin, validate_origins } from "./src/config.ts";
import { build_site_props } from "./src/sites.ts";
import { config as deploy_config } from "./src/env.generated.ts";

const stack_program = Effect.gen(function* () {
  const { stage } = yield* Alchemy.Stack;
  const deploy_env = yield* deploy_config;
  const core_origin = yield* normalize_origin(deploy_env.AST_CORE_ORIGIN, "AST_CORE_ORIGIN");
  const relay_origin = yield* normalize_origin(deploy_env.AST_RELAY_ORIGIN, "AST_RELAY_ORIGIN");
  const site_origin = yield* normalize_origin(deploy_env.AST_SITE_ORIGIN, "AST_SITE_ORIGIN");
  yield* validate_origins(stage, core_origin, relay_origin, site_origin);

  const site = yield* Cloudflare.Website.SvelteKit("Site", build_site_props(core_origin, site_origin));

  return {
    site_url: site.url,
    site_urls: site.urls,
    auth_url: `${site_origin}/auth`,
    dashboard_url: `${site_origin}/dashboard`,
    stage,
  };
}).pipe(Effect.catchTag("InvalidDeployment", Effect.die));

export default Alchemy.Stack(
  stack_name,
  { providers: Cloudflare.providers(), state: Cloudflare.state() },
  stack_program,
);
