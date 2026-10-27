import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiError, activity_query_options } from "@artisanstreet/core-client";
import { create_api_for_browser } from "../../lib/query-client.ts";
import { friendly_error } from "../../lib/friendly-error.ts";
import { format_when, short_id } from "../../lib/format.ts";
import { sign_in_url } from "../../lib/auth-redirect.ts";
import { Button, Spinner } from "@artisanstreet/ui";

export const ActivityPage = (): React.ReactElement => {
  const api = React.useMemo(() => create_api_for_browser(), []);
  const [limit_value, set_limit_value] = React.useState(50);

  const activity_query = useQuery({ ...activity_query_options(api, limit_value), retry: false });

  if (activity_query.isPending) {
    return (
      <section aria-label="Activity">
        <div className="page-head">
          <h1>Activity</h1>
          <p>Loading real API events…</p>
        </div>
        <div className="dash-panel" role="status">
          <Spinner label="Loading activity…" />
        </div>
      </section>
    );
  }

  if (activity_query.isError) {
    const err = activity_query.error;
    if (err instanceof ApiError && err.status === 401) {
      if (typeof window !== "undefined") window.location.href = sign_in_url("/activity");
      return (
        <section aria-label="Activity">
          <div className="page-head">
            <h1>Activity</h1>
            <p>Redirecting…</p>
          </div>
        </section>
      );
    }
    return (
      <section aria-label="Activity">
        <div className="page-head">
          <h1>Activity</h1>
          <p>Recent account events from the API.</p>
        </div>
        <div className="dash-panel" role="alert">
          <p>{friendly_error(err)}</p>
        </div>
      </section>
    );
  }

  const events = activity_query.data.events;

  return (
    <section aria-label="Activity">
      <div className="page-head">
        <h1>Activity</h1>
        <p>Paginated real API events. Ownership always stays with Core.</p>
      </div>
      <div className="dash-panel">
        <h2>Recent events ({events.length})</h2>
        <div className="row">
          {[25, 50, 100].map((n) => (
            <Button key={n} variant={limit_value === n ? "primary" : "secondary"} onClick={() => set_limit_value(n)}>
              {n}
            </Button>
          ))}
        </div>
        {events.length === 0 ? (
          <div className="state-box">No events yet. Actions on machines, sessions, and credentials will appear here.</div>
        ) : (
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Kind</th>
                  <th>Machine</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td>
                      {format_when(e.created_at)}
                      <br />
                      <span className="mono small muted">{short_id(e.id)}</span>
                    </td>
                    <td>{e.kind}</td>
                    <td className="mono small">{e.machine_id ? short_id(e.machine_id) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
