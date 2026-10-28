import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Effect } from "effect";
import { create_core_api } from "@artisanstreet/core-client";
import { CORE_API_BASE } from "../lib/env.ts";
import { clear_request_secret, load_request_secret, store_request_secret } from "../lib/auth/storage.ts";
import { finalize_effect, next_login_state, type LoginState } from "../lib/auth/state.ts";
import { start_login_poll } from "../lib/login-poll.ts";
import { friendly_error } from "../lib/friendly-error.ts";
import { dashboard_url } from "../lib/return-to.ts";

export type SignInFlow =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "Sending" }
  | { readonly _tag: "Waiting"; readonly login: LoginState; readonly message: string }
  | { readonly _tag: "Approved"; readonly login: LoginState; readonly error?: string }
  | { readonly _tag: "Finishing"; readonly login: LoginState }
  | { readonly _tag: "Expired" }
  | { readonly _tag: "Failed"; readonly message: string };

// React Compiler identifies custom hooks by the useX naming convention.
export const useSignIn = (return_to?: string) => {
  const api = useMemo(() => create_core_api(CORE_API_BASE), []);
  const [flow, set_flow] = useState<SignInFlow>({ _tag: "Idle" });
  const generation = useRef(0);
  const current_request = useRef<string | null>(null);
  const sending = useRef(false);

  useEffect(() => () => {
    generation.current += 1;
  }, []);

  const finish = useMutation({
    mutationFn: async (args: {
      login: LoginState;
      generation: number;
      totp_code?: string;
      recovery_code?: string;
    }) => {
      if (args.login.phase !== "completed") {
        const payload = await Effect.runPromise(finalize_effect({
          state: args.login,
          opts: {
            request_secret: load_request_secret(args.login.request_id),
            totp_code: args.totp_code,
            recovery_code: args.recovery_code,
          },
        }));
        await api.finalize_magic_link(payload.request_id, payload.request_secret, {
          totp_code: payload.totp_code,
          recovery_code: payload.recovery_code,
        });
      }
      await api.me();
    },
    onSuccess: (_, args) => {
      if (args.generation !== generation.current) return;
      clear_request_secret(args.login.request_id);
      current_request.current = null;
      window.location.assign(dashboard_url(return_to));
    },
    onError: (error, args) => {
      if (args.generation !== generation.current) return;
      set_flow(args.login.phase === "completed"
        ? { _tag: "Failed", message: friendly_error(error) }
        : { _tag: "Approved", login: args.login, error: friendly_error(error) });
    },
  });

  useEffect(() => {
    if (flow._tag !== "Waiting") return;
    const initial = flow.login;
    const expected_generation = generation.current;
    const controller = new AbortController();
    const is_cancelled = () => controller.signal.aborted || expected_generation !== generation.current;
    const stop = start_login_poll(api, initial.request_id,
      () => load_request_secret(initial.request_id), {
        on_approved: (result) => {
          if (!is_cancelled()) set_flow({ _tag: "Approved", login: next_login_state(initial, result) });
        },
        on_completed: (result) => {
          if (is_cancelled()) return;
          const login = next_login_state(initial, result);
          set_flow({ _tag: "Finishing", login });
          finish.mutate({ login, generation: expected_generation });
        },
        on_expired: () => {
          if (is_cancelled()) return;
          clear_request_secret(initial.request_id);
          set_flow({ _tag: "Expired" });
        },
        on_transient: () => {},
        on_terminal: (message) => {
          if (!is_cancelled()) set_flow({ _tag: "Failed", message });
        },
        is_cancelled,
        format_error: friendly_error,
      }, controller.signal);
    return () => {
      controller.abort();
      stop();
    };
  }, [flow, api, finish.mutate]);

  const request = useMutation({
    mutationFn: (args: { email: string; generation: number }) => api.request_magic_link(args.email),
    onSuccess: (response, args) => {
      if (args.generation !== generation.current) return;
      sending.current = false;
      current_request.current = response.request_id;
      store_request_secret(response.request_id, response.request_secret);
      set_flow({
        _tag: "Waiting",
        login: {
          request_id: response.request_id,
          email: args.email,
          expires_at: response.expires_at,
          phase: "pending",
          totp_required: false,
        },
        message: "We have sent an email to your inbox. Check spam as well!",
      });
    },
    onError: (error, args) => {
      if (args.generation !== generation.current) return;
      sending.current = false;
      set_flow({ _tag: "Failed", message: friendly_error(error) });
    },
  });

  const request_link = (email: string) => {
    if (sending.current || flow._tag === "Finishing") return;
    sending.current = true;
    generation.current += 1;
    if (current_request.current) clear_request_secret(current_request.current);
    current_request.current = null;
    set_flow({ _tag: "Sending" });
    request.mutate({ email: email.trim(), generation: generation.current });
  };

  const finish_sign_in = (totp_code?: string, recovery_code?: string) => {
    if (flow._tag !== "Approved") return;
    const login = flow.login;
    set_flow({ _tag: "Finishing", login });
    finish.mutate({ login, generation: generation.current, totp_code, recovery_code });
  };

  return { flow, request_link, finish_sign_in };
};
