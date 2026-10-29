import { VITE_CORE_API_URL } from "$app/env/public";
import { ClientRuntime } from "svelte-effect-runtime";
import { CoreApi } from "./lib/core/api.ts";

ClientRuntime.make(CoreApi.layer(VITE_CORE_API_URL, globalThis.fetch.bind(globalThis)));
