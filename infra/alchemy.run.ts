import * as Alchemy from "alchemy";
import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Effect from "effect/Effect";
import { STACK_NAME, assert_all_origins_distinct, assert_browser_origins_for_stage, assert_origin_for_stage, normalize_origin } from "./src/config.ts";
import { build_auth_props, build_dashboard_props } from "./src/sites.ts";
import { config as deploy_config } from "./src/env.generated.ts";

// Composition root — export default the Stack.
// Two independent TanStack Start Workers (auth + dashboard), exact custom
// domains on every stage, no WorkersDev. Cloudflare.Website.Vite builds
// each Start app (tanstackStart() + viteReact() in the app's own
// vite.config.ts; Alchemy appends its own Cloudflare plugin — never mix in
// @cloudflare/vite-plugin). State is Cloudflare-backed remote, stage
// isolated. No sibling source imports beyond workspace packages (memo
// covers them for rebuilds).
export default Alchemy.Stack(
  STACK_NAME,
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const { stage } = yield* Alchemy.Stack;

    const deploy_env = yield* deploy_config;
    const core_origin = normalize_origin(deploy_env.AST_CORE_ORIGIN, "AST_CORE_ORIGIN");
    const relay_origin = normalize_origin(deploy_env.AST_RELAY_ORIGIN, "AST_RELAY_ORIGIN");
    const auth_origin = normalize_origin(deploy_env.AST_AUTH_ORIGIN, "AST_AUTH_ORIGIN");
    const dashboard_origin = normalize_origin(deploy_env.AST_DASHBOARD_ORIGIN, "AST_DASHBOARD_ORIGIN");
    assert_origin_for_stage(core_origin, "AST_CORE_ORIGIN", stage);
    assert_origin_for_stage(relay_origin, "AST_RELAY_ORIGIN", stage);
    assert_browser_origins_for_stage(auth_origin, dashboard_origin, stage);
    assert_all_origins_distinct(core_origin, relay_origin, auth_origin, dashboard_origin);

    const auth_props = build_auth_props(stage, { core_origin, relay_origin, auth_origin, dashboard_origin });
    const dashboard_props = build_dashboard_props(stage, { core_origin, relay_origin, auth_origin, dashboard_origin });

    const auth_site = yield* Cloudflare.Website.Vite("AuthSite", {
      rootDir: auth_props.rootDir,
      domain: auth_props.domain,
      workersDev: auth_props.workersDev,
      env: auth_props.env,
      memo: auth_props.memo,
    });
    const dashboard_site = yield* Cloudflare.Website.Vite("DashboardSite", {
      rootDir: dashboard_props.rootDir,
      domain: dashboard_props.domain,
      workersDev: dashboard_props.workersDev,
      env: dashboard_props.env,
      memo: dashboard_props.memo,
    });

    return {
      authUrl: auth_site.url,
      authUrls: auth_site.urls,
      dashboardUrl: dashboard_site.url,
      dashboardUrls: dashboard_site.urls,
      stage,
    };
  }),
);
