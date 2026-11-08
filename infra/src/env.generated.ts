import * as Config from "effect/Config";
import * as Effect from "effect/Effect";

export const config = Config.all({
  AST_CORE_ORIGIN: Config.String("AST_CORE_ORIGIN"),
  AST_RELAY_ORIGIN: Config.String("AST_RELAY_ORIGIN"),
  AST_SITE_ORIGIN: Config.String("AST_SITE_ORIGIN"),
});

export const generated = config.pipe(Effect.orDie);
