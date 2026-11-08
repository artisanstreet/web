import * as Path from "node:path";
import { fileURLToPath as file_url_to_path } from "node:url";

const infra_src = Path.dirname(file_url_to_path(import.meta.url));
export const web_root = Path.resolve(infra_src, "..", "..");
export const site_root = Path.join(web_root, "apps", "site");

export const build_site_props = (core_origin: string, site_origin: string) => ({
  rootDir: site_root,
  domain: new URL(site_origin).hostname,
  workersDev: false as const,
  env: { VITE_CORE_API_URL: core_origin },
  memo: {
    include: ["**/*", "../../packages/ui/src/**/*", "../../packages/core-client/src/**/*"],
    lockfile: true as const,
  },
});
