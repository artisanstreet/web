import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, sessions_query_options } from "@artisanstreet/core-client";
import { create_api_for_browser, clear_account_cache } from "../../lib/query-client.ts";
import { friendly_error } from "../../lib/friendly-error.ts";
import { format_when, short_id } from "../../lib/format.ts";
import { sign_in_url } from "../../lib/auth-redirect.ts";
import { Button, Dialog, Spinner, use_toast } from "@artisanstreet/ui";

export const SessionsPage = (): React.ReactElement => {
  const api = React.useMemo(() => create_api_for_browser(), []);
  const query_client = useQueryClient();
  const toast = use_toast();
  const [confirm_all, set_confirm_all] = React.useState(false);

  const sessions_query = useQuery({ ...sessions_query_options(api), retry: false });

  const logout_mutation = useMutation({
    mutationFn: () => api.revoke_current_session(),
    onSuccess: () => {
      clear_account_cache(query_client);
      toast.push_toast({ title: "Signed out on this browser", tone: "ok" });
      window.location.href = sign_in_url("/");
    },
    onError: (err) => toast.push_toast({ title: "Sign out failed", description: friendly_error(err), tone: "err" }),
  });

  const revoke_all_mutation = useMutation({
    mutationFn: () => api.revoke_all_sessions(),
    onSuccess: () => {
      clear_account_cache(query_client);
      toast.push_toast({ title: "All sessions revoked", tone: "ok" });
      set_confirm_all(false);
      window.location.href = sign_in_url("/");
    },
    onError: (err) => toast.push_toast({ title: "Revoke failed", description: friendly_error(err), tone: "err" }),
  });

  if (sessions_query.isPending) {
    return (
      <section aria-label="Sessions">
        <div className="page-head">
          <h1>Sessions</h1>
          <p>Loading browsers…</p>
        </div>
        <div className="dash-panel" role="status">
          <Spinner label="Loading sessions…" />
        </div>
      </section>
    );
  }

  if (sessions_query.isError) {
    const err = sessions_query.error;
    if (err instanceof ApiError && err.status === 401) {
      if (typeof window !== "undefined") window.location.href = sign_in_url("/sessions");
      return (
        <section aria-label="Sessions">
          <div className="page-head">
            <h1>Sessions</h1>
            <p>Redirecting…</p>
          </div>
        </section>
      );
    }
    return (
      <section aria-label="Sessions">
        <div className="page-head">
          <h1>Sessions</h1>
          <p>Browsers holding revocable sessions.</p>
        </div>
        <div className="dash-panel" role="alert">
          <p>{friendly_error(err)}</p>
        </div>
      </section>
    );
  }

  const sessions = sessions_query.data.sessions;

  return (
    <section aria-label="Sessions">
      <div className="page-head">
        <h1>Sessions</h1>
        <p>Each row is a browser holding a revocable session. Sign-in sets a persistent HttpOnly cookie; closing the tab does not sign you out.</p>
      </div>
      <div className="dash-panel">
        <h2>Signed-in browsers ({sessions.length})</h2>
        {sessions.length === 0 ? (
          <div className="state-box">No sessions — that should not happen while signed in.</div>
        ) : (
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Signed in</th>
                  <th>Expires</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {s.device_name || "unnamed browser"}
                      <br />
                      <span className="mono small muted">{short_id(s.id)}</span>
                    </td>
                    <td>{format_when(s.created_at)}</td>
                    <td>{format_when(s.expires_at)}</td>
                    <td>{s.revoked_at ? `revoked ${format_when(s.revoked_at)}` : "active"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="row">
          <Button variant="secondary" onClick={() => logout_mutation.mutate()} disabled={logout_mutation.isPending}>
            {logout_mutation.isPending ? "Signing out…" : "Sign out this browser"}
          </Button>
          <Button variant="secondary" onClick={() => set_confirm_all(true)} disabled={revoke_all_mutation.isPending}>
            Sign out everywhere
          </Button>
        </div>
      </div>
      <Dialog
        open={confirm_all}
        onOpenChange={(open) => {
          if (!open) set_confirm_all(false);
        }}
        title="Sign out everywhere?"
        description="This revokes all sessions, including this browser. You will need to sign in again."
      >
        <div className="row">
          <Button variant="secondary" onClick={() => set_confirm_all(false)}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            disabled={revoke_all_mutation.isPending}
            onClick={() => {
              if (!revoke_all_mutation.isPending) revoke_all_mutation.mutate();
            }}
          >
            {revoke_all_mutation.isPending ? "Revoking…" : "Revoke all sessions"}
          </Button>
        </div>
      </Dialog>
    </section>
  );
};
