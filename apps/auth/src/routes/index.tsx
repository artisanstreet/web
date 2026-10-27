import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as React from "react";
import { Effect, Match } from "effect";
import { ApiError, create_core_api, me_query_options } from "@artisanstreet/core-client";
import { Button, TextField } from "@artisanstreet/ui";
import { CORE_API_BASE } from "../lib/env.ts";
import {
  clear_request_secret,
  load_request_secret,
  store_request_secret,
} from "../lib/auth/storage.ts";
import {
  finalize_effect,
  next_login_state,
  type LoginState,
} from "../lib/auth/state.ts";
import { start_login_poll } from "../lib/login-poll.ts";
import { friendly_error } from "../lib/friendly-error.ts";
import { dashboard_url, parse_return_to } from "../lib/return-to.ts";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    return_to: typeof search.return_to === "string" ? search.return_to : undefined,
  }),
  component: SignInPage,
});

type Phase = LoginState["phase"] | "idle";

interface PendingState extends LoginState {
  readonly phase: Exclude<Phase, "idle">;
}

function SignInPage() {
  const search = Route.useSearch();
  const return_to_raw = search.return_to;
  const safe_return_to = parse_return_to(return_to_raw);
  const api = React.useMemo(() => create_core_api(CORE_API_BASE), []);
  const [email_value, set_email_value] = React.useState("");
  const [pending, set_pending] = React.useState<PendingState | null>(null);
  const [form_error, set_form_error] = React.useState<string | null>(null);
  const [poll_note, set_poll_note] = React.useState<string | null>(null);
  const [finish_error, set_finish_error] = React.useState<string | null>(null);
  const [totp_value, set_totp_value] = React.useState("");
  const [recovery_value, set_recovery_value] = React.useState("");
  const [use_recovery, set_use_recovery] = React.useState(false);
  const [resent, set_resent] = React.useState(false);
  const poll_stop_ref = React.useRef<(() => void) | null>(null);
  const abort_ref = React.useRef<AbortController | null>(null);

  const me_query = useQuery({ ...me_query_options(api), retry: false });

  React.useEffect(() => {
    if (me_query.data) {
      window.location.href = dashboard_url(safe_return_to);
    }
  }, [me_query.data, safe_return_to]);

  React.useEffect(
    () => () => {
      poll_stop_ref.current?.();
      abort_ref.current?.abort();
    },
    [],
  );

  const stop_poll = () => {
    poll_stop_ref.current?.();
    poll_stop_ref.current = null;
    abort_ref.current?.abort();
    abort_ref.current = null;
  };

  const request_mutation = useMutation({
    mutationFn: (email: string) => api.request_magic_link(email.trim(), undefined, undefined),
    onSuccess: (res, email) => {
      set_form_error(null);
      set_finish_error(null);
      set_resent(false);
      set_totp_value("");
      set_recovery_value("");
      set_use_recovery(false);
      stop_poll();
      store_request_secret(res.request_id, res.request_secret);
      const initial: PendingState = {
        request_id: res.request_id,
        email: email.trim(),
        expires_at: res.expires_at,
        phase: "requested",
        totp_required: false,
      };
      set_pending(initial);
      set_poll_note("Sending…");
      begin_poll(initial);
    },
    onError: (err) => {
      set_form_error(friendly_error(err));
    },
  });

  const begin_poll = (initial: PendingState) => {
    const controller = new AbortController();
    abort_ref.current = controller;
    let current: PendingState = initial;
    const stop = start_login_poll(
      api,
      initial.request_id,
      () => load_request_secret(initial.request_id),
      {
        on_approved: (s) => {
          current = next_login_state(current, s) as PendingState;
          set_pending(current);
          set_poll_note("Approved. Finish sign-in below.");
        },
        on_completed: (s) => {
          current = next_login_state(current, s) as PendingState;
          set_pending(current);
          set_poll_note("Already signed in on this request.");
        },
        on_expired: () => {
          current = { ...current, phase: "expired" };
          set_pending(current);
          set_poll_note("This request expired. Request a fresh link.");
        },
        on_transient: () => {
          set_poll_note("Connection hiccup — still waiting…");
        },
        on_terminal: (message) => {
          set_poll_note(message);
        },
        is_cancelled: () => controller.signal.aborted,
        format_error: (err) => friendly_error(err),
      },
      controller.signal,
    );
    poll_stop_ref.current = stop;
  };

  const finish_mutation = useMutation({
    mutationFn: async () => {
      if (!pending) throw new Error("No sign-in request.");
      const secret = load_request_secret(pending.request_id);
      const payload = await Effect.runPromise(
        finalize_effect({
          state: pending,
          opts: {
            request_secret: secret,
            totp_code: !use_recovery && totp_value.trim() ? totp_value.trim() : undefined,
            recovery_code: use_recovery && recovery_value.trim() ? recovery_value.trim() : undefined,
          },
        }),
      );
      await api.finalize_magic_link(payload.request_id, payload.request_secret, {
        totp_code: payload.totp_code,
        recovery_code: payload.recovery_code,
      });
      await api.me();
      return pending.request_id;
    },
    onSuccess: (request_id) => {
      clear_request_secret(request_id);
      stop_poll();
      window.location.href = dashboard_url(safe_return_to);
    },
    onError: (err) => {
      set_finish_error(friendly_error(err));
    },
  });

  const resend_mutation = useMutation({
    mutationFn: () => {
      if (!pending) throw new Error("No sign-in request.");
      return api.request_magic_link(pending.email, undefined, undefined);
    },
    onSuccess: (res) => {
      if (!pending) return;
      clear_request_secret(pending.request_id);
      store_request_secret(res.request_id, res.request_secret);
      const next: PendingState = {
        request_id: res.request_id,
        email: pending.email,
        expires_at: res.expires_at,
        phase: "requested",
        totp_required: false,
      };
      stop_poll();
      set_pending(next);
      set_poll_note("Sent a fresh link.");
      set_resent(true);
      set_finish_error(null);
      begin_poll(next);
    },
    onError: (err) => {
      set_finish_error(friendly_error(err));
    },
  });

  const submit_email = (e: React.FormEvent) => {
    e.preventDefault();
    set_form_error(null);
    const trimmed = email_value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      set_form_error("Enter a valid email address.");
      return;
    }
    request_mutation.mutate(trimmed);
  };

  const start_over = () => {
    if (pending) clear_request_secret(pending.request_id);
    stop_poll();
    set_pending(null);
    set_poll_note(null);
    set_finish_error(null);
    set_form_error(null);
    set_totp_value("");
    set_recovery_value("");
    set_use_recovery(false);
    set_resent(false);
  };

  const show_finish = pending !== null && (pending.phase === "email_approved" || pending.phase === "completed");

  return (
    <section aria-labelledby="signin-title">
      <h1 id="signin-title" className="auth-title">
        Sign in to Artisan
      </h1>
      <p className="auth-lede">
        We email you a one-time link. Open it, approve, then finish here.
      </p>

      {pending === null ? (
        <form onSubmit={submit_email} noValidate>
          <TextField
            id="signin-email"
            label="Email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email_value}
            onValueChange={set_email_value}
            error={form_error ?? undefined}
          />
          <Button
            variant="primary"
            type="submit"
            disabled={request_mutation.isPending}
          >
            {request_mutation.isPending ? "Sending…" : "Email me a link"}
          </Button>
        </form>
      ) : (
        <div>
          <p className="auth-status" role="status">
            {pending.phase === "expired"
              ? "This request expired."
              : `Waiting for approval — we emailed ${pending.email}.`}
          </p>
          {poll_note ? (
            <p
              className="auth-status"
              role="status"
              data-tone={Match.value(poll_note).pipe(
                Match.when(
                  (s) => /approved|fresh/i.test(s),
                  () => "ok" as const,
                ),
                Match.when(
                  (s) => /expired|lost|hiccup/i.test(s),
                  () => undefined as undefined,
                ),
                Match.orElse(() => undefined as undefined),
              )}
            >
              {poll_note}
            </p>
          ) : null}

          {show_finish ? (
            <>
              {pending.totp_required ? (
                <>
                  {use_recovery ? (
                    <TextField
                      id="signin-rec"
                      label="Recovery code"
                      autoComplete="off"
                      placeholder="Use once, instead of the authenticator"
                      value={recovery_value}
                      onValueChange={set_recovery_value}
                    />
                  ) : (
                    <TextField
                      id="signin-totp"
                      label="Authenticator code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      value={totp_value}
                      onValueChange={set_totp_value}
                    />
                  )}
                  <div className="auth-row">
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => set_use_recovery((v) => !v)}
                    >
                      {use_recovery ? "Use the authenticator instead" : "Use a recovery code instead"}
                    </Button>
                  </div>
                </>
              ) : null}
              <Button
                variant="primary"
                type="button"
                disabled={finish_mutation.isPending}
                onClick={() => finish_mutation.mutate()}
              >
                {finish_mutation.isPending ? "Finishing…" : "Finish sign-in on this device"}
              </Button>
              {finish_error ? (
                <p className="auth-error" role="alert">
                  {finish_error}
                </p>
              ) : null}
            </>
          ) : null}

          <div className="auth-row">
            {pending.phase === "expired" || pending.phase === "completed" ? null : (
              <Button
                variant="secondary"
                type="button"
                disabled={resend_mutation.isPending}
                onClick={() => resend_mutation.mutate()}
              >
                {resend_mutation.isPending ? "Resending…" : resent ? "Resend again" : "Resend link"}
              </Button>
            )}
            <Button variant="secondary" type="button" onClick={start_over}>
              Start over
            </Button>
          </div>
          {pending.phase === "expired" ? (
            <p className="auth-hint">Links expire after 15 minutes. Request a fresh one above.</p>
          ) : null}
          {request_mutation.error instanceof ApiError &&
          request_mutation.error.status === 401 ? (
            <p className="auth-hint">Email delivery is unavailable right now. Try again in a bit.</p>
          ) : null}
        </div>
      )}
    </section>
  );
}
