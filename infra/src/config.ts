import { Data, Effect, Match, Option } from "effect";

export const stack_name = "ast-web" as const;
export const site_prod_origin = "https://artisan.st" as const;

export class InvalidDeployment extends Data.TaggedError("InvalidDeployment")<{
  readonly reason: string;
}> {}

const require_valid = (valid: boolean, reason: string) =>
  Match.value(valid).pipe(
    Match.when(true, () => Effect.void),
    Match.orElse(() => Effect.fail(new InvalidDeployment({ reason }))),
  );

export const validate_stage = (stage: string) =>
  require_valid(/^[a-z0-9][-_a-z0-9]*$/.test(stage), "Stage must match [a-z0-9][-_a-z0-9]*");

export const normalize_origin = (raw: string | undefined, name: string) => Effect.gen(function* () {
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "");
  const url = yield* Effect.fromOption(
    Option.fromNullishOr(URL.parse(trimmed)),
    () => new InvalidDeployment({ reason: `${name} must be an absolute URL` }),
  );
  yield* require_valid(
    url.protocol === "https:" && Boolean(url.hostname) && !url.hostname.includes("*")
      && !url.username && !url.password && !url.search && !url.hash && url.pathname === "/",
    `${name} must be an exact HTTPS origin without credentials, path, query or fragment`,
  );
  return url.origin;
});

export const validate_origins = (stage: string, core_origin: string, relay_origin: string, site_origin: string) =>
  Effect.gen(function* () {
    yield* validate_stage(stage);
    yield* require_valid(
      new Set([core_origin, relay_origin, site_origin].map((origin) => new URL(origin).hostname)).size === 3,
      "API, relay and website must have distinct hostnames",
    );
    yield* require_valid(
      stage === "prod" ? site_origin === site_prod_origin : site_origin !== site_prod_origin,
      "Production must use artisan.st; previews must use their own website origin",
    );
  });
