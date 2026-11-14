import { Option } from "effect";
import { Handler } from "svelte-effect-runtime/server";
import { Download, download_for, machine_of } from "../../../lib/download/machine.ts";
import type { RequestHandler } from "./$types";

const hint_headers = {
  "Accept-CH": "Sec-CH-UA-Platform, Sec-CH-UA-Arch",
  Vary: "Sec-CH-UA-Platform, Sec-CH-UA-Arch, User-Agent",
};

const redirect_to = (location: string, status: number, extra: Record<string, string> = {}) =>
  new Response(null, { status, headers: { ...hint_headers, ...extra, Location: location } });

export const GET = Handler<RequestHandler>(function* ({ request, url }) {
  const machine = machine_of({
    platform: Option.fromNullishOr(request.headers.get("sec-ch-ua-platform")),
    arch: Option.fromNullishOr(request.headers.get("sec-ch-ua-arch")),
    user_agent: request.headers.get("user-agent") ?? "",
  });
  return Download.$match(download_for(machine, url.searchParams.has("hinted")), {
    Binary: ({ url: binary }) => redirect_to(binary, 302),
    ReleasePage: ({ url: page }) => redirect_to(page, 302),
    AskForHints: () => redirect_to(`${url.pathname}?hinted=1`, 307, { "Critical-CH": "Sec-CH-UA-Arch" }),
  });
});
