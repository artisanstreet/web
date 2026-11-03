import { VITE_CORE_API_URL } from "$app/env/public";
import { ClientRuntime } from "svelte-effect-runtime";
import { CoreApi } from "@artisanstreet/core-client";
import { active_account } from "./lib/account/active.ts";

ClientRuntime.make(CoreApi.layer(import.meta.env.DEV ? globalThis.location.origin : VITE_CORE_API_URL, globalThis.fetch.bind(globalThis), active_account));
