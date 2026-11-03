import { VITE_CORE_API_URL } from "$app/env/public";
import { Layer } from "effect";
import { ClientRuntime } from "svelte-effect-runtime";
import { CoreApi } from "@artisanstreet/core-client";
import { HandoffChannel } from "./lib/sign-in/handoff.ts";

ClientRuntime.make(
  Layer.mergeAll(CoreApi.layer(import.meta.env.DEV ? globalThis.location.origin : VITE_CORE_API_URL, globalThis.fetch.bind(globalThis)), HandoffChannel.layer),
);
