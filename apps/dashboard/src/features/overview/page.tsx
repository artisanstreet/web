import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Match } from "effect";
import { ApiError, latest_bundle_query_options, me_query_options } from "@artisanstreet/core-client";
import { create_api_for_browser } from "../../lib/query-client.ts";
import { friendly_error } from "../../lib/friendly-error.ts";
import { format_count, format_when, short_id } from "../../lib/format.ts";
import { sign_in_url, current_return_path } from "../../lib/auth-redirect.ts";
import { Badge, Button, Spinner } from "@artisanstreet/ui";

type LoadState =
  | { readonly _tag: "Loading" }
  | { readonly _tag: "Unauthed" }
  | { readonly _tag: "Failed"; readonly message: string }
  | { readonly _tag: "Ready" };

export const OverviewPage = (): React.ReactElement => {
  const api = React.useMemo(() => create_api_for_browser(), []);
  const me_query = useQuery({ ...me_query_options(api), retry: false });
  const bundle_query = useQuery({ ...latest_bundle_query_options(api), retry: false, enabled: me_query.isSuccess });

  const state: LoadState = Match.value({
    me_status: me_query.status,
    me_error: me_query.error,
  }).pipe(
    Match.when({ me_status: "pending" }, () => ({ _tag: "Loading" }) as LoadState),
    Match.when(
      { me_status: "error" },
      ({ me_error }) =>
        me_error instanceof ApiError && me_error.status === 401
          ? ({ _tag: "Unauthed" } as LoadState)
          : ({ _tag: "Failed", message: friendly_error(me_error) } as LoadState),
    ),
    Match.orElse(() => ({ _tag: "Ready" }) as LoadState),
  );

  return Match.value(state).pipe(
    Match.tag("Loading", () => (
      <section aria-label="Overview">
        <div className="page-head">
          <h1>Overview</h1>
          <p>Checking your session…</p>
        </div>
        <div className="dash-panel" role="status">
          <Spinner label="Loading account identity…" />
        </div>
      </section>
    )),
    Match.tag("Unauthed", () => {
      const login_href = sign_in_url(current_return_path());
      if (typeof window !== "undefined") window.location.href = login_href;
      return (
        <section aria-label="Overview">
          <div className="page-head">
            <h1>Sign in required</h1>
            <p>
              <a href={login_href}>Continue to sign in</a>.
            </p>
          </div>
        </section>
      );
    }),
    Match.tag("Failed", (s) => (
      <section aria-label="Overview">
        <div className="page-head">
          <h1>Overview</h1>
          <p>Account, security, and configuration status.</p>
        </div>
        <div className="dash-panel" role="alert">
          <h2>Could not load account</h2>
          <p>{s.message}</p>
          <p>
            <Button
              variant="primary"
              disabled={me_query.isFetching}
              onClick={() => {
                void me_query.refetch();
                void bundle_query.refetch();
              }}
            >
              {me_query.isFetching ? "Retrying…" : "Try again"}
            </Button>
          </p>
        </div>
      </section>
    )),
    Match.tag("Ready", () => {
      const me = me_query.data;
      if (!me)
        return (
          <div className="dash-panel" role="status">
            <p className="muted">No account data.</p>
          </div>
        );
      const active_machines = me.machines.filter((m) => !m.revoked_at);
      const bundle = bundle_query.data?.bundle ?? null;
      const manifest = bundle_query.data?.manifest ?? null;
      const mcp_count =
        manifest && typeof manifest === "object" && "mcp_servers" in manifest
          ? (manifest as unknown as { readonly mcp_servers: ReadonlyArray<unknown> }).mcp_servers.length
          : 0;
      return (
        <section aria-label="Overview">
          <div className="page-head">
            <h1>Overview</h1>
            <p>Account, security, and configuration status.</p>
          </div>
          <div className="dash-panel">
            <h2>Account</h2>
            <dl className="kv">
              <dt>Email</dt>
              <dd>
                <strong>{me.email}</strong>
              </dd>
              <dt>Name</dt>
              <dd>{me.display_name || "—"}</dd>
              <dt>Account</dt>
              <dd className="mono">{me.account_id}</dd>
              <dt>Two-step sign-in</dt>
              <dd>
                {me.totp_enrolled ? <Badge tone="ok">on</Badge> : <Badge tone="warn">off</Badge>} <a href="/security">Manage</a>
              </dd>
            </dl>
          </div>
          <div className="dash-panel">
            <h2>
              Machines · {format_count("active", active_machines.length)} of {format_count("total", me.machines.length)}
            </h2>
            {active_machines.length === 0 ? (
              <div className="state-box">
                No active machines. <a href="/machines">Claim an enrollment code</a>.
              </div>
            ) : (
              <div className="table-wrap">
                <table className="grid">
                  <thead>
                    <tr>
                      <th>Forge</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active_machines.slice(0, 5).map((m) => (
                      <tr key={m.id}>
                        <td>
                          {m.label || "unnamed Forge"}
                          <br />
                          <span className="mono small muted">{short_id(m.id)}</span>
                        </td>
                        <td>{format_when(m.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="small">
              <a href="/machines">Manage machines</a>
            </p>
          </div>
          <div className="dash-panel">
            <h2>Configuration</h2>
            {!bundle ? (
              <div className="state-box">
                No bundle published yet. <a href="/config">Publish one</a>.
              </div>
            ) : (
              <dl className="kv">
                <dt>Version</dt>
                <dd>
                  v{bundle.version} · {mcp_count} MCP · published {format_when(bundle.created_at)}
                </dd>
                <dt>Content hash</dt>
                <dd className="mono">{bundle.content_hash.slice(0, 16)}…</dd>
              </dl>
            )}
            <p className="small">
              <a href="/config">Manage configuration</a> · <a href="/credentials">Credentials</a> · <a href="/activity">Activity</a>
            </p>
          </div>
        </section>
      );
    }),
    Match.exhaustive,
  );
};
