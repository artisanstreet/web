import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import * as React from "react";
import { Effect } from "effect";
import { create_core_api } from "@artisanstreet/core-client";
import { Button, TextField } from "@artisanstreet/ui";
import { CORE_API_BASE } from "../lib/env.ts";
import { load_request_secret } from "../lib/auth/storage.ts";
import { finalize_effect, type LoginState } from "../lib/auth/state.ts";
import { clear_request_secret } from "../lib/auth/storage.ts";
import { friendly_error } from "../lib/friendly-error.ts";
import { dashboard_url, parse_return_to } from "../lib/return-to.ts";

export const Route = createFileRoute("/approve")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
    return_to: typeof search.return_to === "string" ? search.return_to : undefined,
  }),
  component: ApprovePage,
});

type ApproveOutcome =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "ApprovedSameTab"; readonly request_id: string; readonly totp_required: boolean }
  | { readonly _tag: "ApprovedOtherTab" }
  | { readonly _tag: "Expired" }
  | { readonly _tag: "Failed"; readonly message: string };

function ApprovePage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const token_raw = search.token;
  const token = typeof token_raw === "string" && token_raw.length > 0 ? token_raw : null;
  const safe_return_to = parse_return_to(search.return_to);
  const api = React.useMemo(() => create_core_api(CORE_API_BASE), []);
  const [outcome, set_outcome] = React.useState<ApproveOutcome>({ _tag: "Idle" });
  const [approve_error, set_approve_error] = React.useState<string | null>(null);
  const [totp_value, set_totp_value] = React.useState("");
  const [recovery_value, set_recovery_value] = React.useState("");
  const [use_recovery, set_use_recovery] = React.useState(false);
  const [finish_error, set_finish_error] = React.useState<string | null>(null);
  const [consumed, set_consumed] = React.useState(false);

  // GET never consumes: no effect here calls consume. Only the button does.
  const scrub_token_from_url = () => {
    navigate({
      to: "/approve",
      search: { token: undefined, return_to: safe_return_to ?? undefined },
      replace: true,
    });
    // Extra history hygiene: drop any residual query carrying the token.
    if (typeof window !== "undefined" && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      window.history.replaceState(null, "", url.toString());
    }
  };

  const consume_mutation = useMutation({
    mutationFn: async (email_token: string) => api.consume_magic_link(email_token),
    onSuccess: (res) => {
      set_consumed(true);
      scrub_token_from_url();
      if (res.status === "expired") {
        set_outcome({ _tag: "Expired" });
        return;
      }
      const secret = load_request_secret(res.request_id);
      if (secret) {
        set_outcome({
          _tag: "ApprovedSameTab",
          request_id: res.request_id,
          totp_required: res.totp_required,
        });
      } else {
        set_outcome({ _tag: "ApprovedOtherTab" });
      }
    },
    onError: (err) => {
      // Generic: wrong/absent tokens reveal nothing about accounts.
      set_approve_error(friendly_error(err));
      set_outcome({ _tag: "Failed", message: friendly_error(err) });
    },
  });

  const finish_mutation = useMutation({
    mutationFn: async () => {
      if (outcome._tag !== "ApprovedSameTab") throw new Error("Nothing to finish.");
      const secret = load_request_secret(outcome.request_id);
      const state: LoginState = {
        request_id: outcome.request_id,
        email: "",
        expires_at: "",
        phase: "email_approved",
        totp_required: outcome.totp_required,
      };
      const payload = await Effect.runPromise(
        finalize_effect({
          state,
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
      return outcome.request_id;
    },
    onSuccess: (request_id) => {
      clear_request_secret(request_id);
      window.location.href = dashboard_url(safe_return_to);
    },
    onError: (err) => {
      set_finish_error(friendly_error(err));
    },
  });

  const approve = () => {
    set_approve_error(null);
    if (!token) return;
    consume_mutation.mutate(token);
  };

  return (
    <section aria-labelledby="approve-title">
      <h1 id="approve-title" className="auth-title">
        Approve this sign-in?
      </h1>
      <p className="auth-lede">
        This approves the sign-in on the browser that requested it. Only approve if you just tried to
        sign in — otherwise ignore this page.
      </p>

      <div>
        {token === null ? (
          <>
            <p className="auth-status" role="status">
              This approval link is missing its token, so there is nothing to approve.
            </p>
            <p className="auth-status">
              <a href="/">Request a new sign-in link</a> and open the fresh approval link from your
              email.
            </p>
          </>
        ) : consumed === false && outcome._tag === "Idle" ? (
          <>
            <Button
              variant="primary"
              type="button"
              disabled={consume_mutation.isPending}
              onClick={approve}
            >
              {consume_mutation.isPending ? "Approving…" : "Approve this request"}
            </Button>
            {approve_error ? (
              <p className="auth-error" role="alert">
                {approve_error}
              </p>
            ) : null}
          </>
        ) : null}

        {outcome._tag === "ApprovedSameTab" ? (
          <>
            <p className="auth-status" data-tone="ok" role="status">
              Approved. This tab started the request — you can finish sign-in here.
            </p>
            {outcome.totp_required ? (
              <>
                {use_recovery ? (
                  <TextField
                    id="approve-rec"
                    label="Recovery code"
                    autoComplete="off"
                    placeholder="Use once, instead of the authenticator"
                    value={recovery_value}
                    onValueChange={set_recovery_value}
                  />
                ) : (
                  <TextField
                    id="approve-totp"
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
              {finish_mutation.isPending ? "Finishing…" : "Finish sign-in"}
            </Button>
            {finish_error ? (
              <p className="auth-error" role="alert">
                {finish_error}
              </p>
            ) : null}
          </>
        ) : null}

        {outcome._tag === "ApprovedOtherTab" ? (
          <p className="auth-status" role="status">
            Approved. This tab did not start the sign-in: finish in the tab that requested the link
            — it picks up this approval on its own. If you requested the link on a different device,
            finish there. You can return to Artisan.
          </p>
        ) : null}

        {outcome._tag === "Expired" ? (
          <>
            <p className="auth-status" data-tone="err" role="status">
              This link expired. Request a fresh one.
            </p>
            <p className="auth-status">
              <a href="/">Request a new sign-in link</a>
            </p>
          </>
        ) : null}

        {outcome._tag === "Failed" ? (
          <p className="auth-error" role="alert">
            {outcome.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
