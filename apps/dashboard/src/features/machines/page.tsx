import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, machines_query_options } from "@artisanstreet/core-client";
import { create_api_for_browser } from "../../lib/query-client.ts";
import { friendly_error } from "../../lib/friendly-error.ts";
import { format_when, short_id } from "../../lib/format.ts";
import { sign_in_url } from "../../lib/auth-redirect.ts";
import { Button, Dialog, Spinner, TextField, use_toast } from "@artisanstreet/ui";

export const MachinesPage = (): React.ReactElement => {
  const api = React.useMemo(() => create_api_for_browser(), []);
  const query_client = useQueryClient();
  const toast = use_toast();
  const [code_value, set_code_value] = React.useState("");
  const [code_error, set_code_error] = React.useState<string | undefined>(undefined);
  const [revoke_id, set_revoke_id] = React.useState<string | null>(null);
  const [revoke_label, set_revoke_label] = React.useState("");

  const machines_query = useQuery({ ...machines_query_options(api), retry: false });

  const invalidate_core = (): void => {
    void query_client.invalidateQueries({ queryKey: ["core"] });
  };

  const claim_mutation = useMutation({
    mutationFn: (code: string) => api.claim_enrollment(code.trim().toUpperCase()),
    onSuccess: (res) => {
      set_code_value("");
      set_code_error(undefined);
      toast.push_toast({ title: "Enrollment claimed", description: `Claimed ${res.enrollment_id}. Confirm it on the Forge.`, tone: "ok" });
      invalidate_core();
    },
    onError: (err) => set_code_error(friendly_error(err)),
  });

  const revoke_mutation = useMutation({
    mutationFn: (id: string) => api.revoke_machine(id),
    onSuccess: () => {
      toast.push_toast({ title: "Machine revoked", tone: "ok" });
      set_revoke_id(null);
      invalidate_core();
    },
    onError: (err) => toast.push_toast({ title: "Revoke failed", description: friendly_error(err), tone: "err" }),
  });

  const claim_submit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (claim_mutation.isPending) return;
    const code = code_value.trim().toUpperCase();
    if (code.length !== 8) {
      set_code_error("Enter the 8-character code from your Forge.");
      return;
    }
    claim_mutation.mutate(code);
  };

  if (machines_query.isPending) {
    return (
      <section aria-label="Machines">
        <div className="page-head">
          <h1>Machines</h1>
          <p>Loading enrolled Forges…</p>
        </div>
        <div className="dash-panel" role="status">
          <Spinner label="Loading machines…" />
        </div>
      </section>
    );
  }

  if (machines_query.isError) {
    const err = machines_query.error;
    if (err instanceof ApiError && err.status === 401) {
      if (typeof window !== "undefined") window.location.href = sign_in_url("/machines");
      return (
        <section aria-label="Machines">
          <div className="page-head">
            <h1>Machines</h1>
            <p>Redirecting to sign in…</p>
          </div>
        </section>
      );
    }
    return (
      <section aria-label="Machines">
        <div className="page-head">
          <h1>Machines</h1>
          <p>Enrolled Forges and enrollment claims.</p>
        </div>
        <div className="dash-panel" role="alert">
          <h2>Could not load machines</h2>
          <p>{friendly_error(err)}</p>
        </div>
      </section>
    );
  }

  const machines = machines_query.data.machines;
  const active = machines.filter((m) => !m.revoked_at);

  return (
    <section aria-label="Machines">
      <div className="page-head">
        <h1>Machines</h1>
        <p>Forges enrolled into this account. Claim by code, revoke with explicit confirm. Ownership always stays with Core.</p>
      </div>
      <div className="dash-panel">
        <h2>Claim a machine enrollment</h2>
        <p className="muted small">Enter the 8-character code your Forge printed. The Forge operator still confirms your exact identity locally.</p>
        <form onSubmit={claim_submit}>
          <TextField
            label="Enrollment code"
            id="claim-code"
            value={code_value}
            onValueChange={set_code_value}
            placeholder="ABCDEFGH"
            autoComplete="off"
            required
            error={code_error}
          />
          <p>
            <Button type="submit" variant="primary" disabled={claim_mutation.isPending}>
              {claim_mutation.isPending ? "Claiming…" : "Claim into this account"}
            </Button>
          </p>
          {claim_mutation.isSuccess ? <p role="status">Claim recorded. Finish confirmation on the Forge itself.</p> : null}
        </form>
      </div>
      <div className="dash-panel">
        <h2>Machines on this account ({machines.length})</h2>
        {machines.length === 0 ? (
          <div className="state-box">No machines enrolled yet. Start an enrollment on the Forge, then claim its code above.</div>
        ) : (
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th>Forge</th>
                  <th>Seen</th>
                  <th>State</th>
                  <th>
                    <span className="small">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {machines.map((m) => (
                  <tr key={m.id}>
                    <td>
                      {m.label || "unnamed Forge"}
                      <br />
                      <span className="mono small muted">{short_id(m.id)}</span>
                      <br />
                      <span className="mono small muted">{m.id}</span>
                    </td>
                    <td>{m.revoked_at ? `revoked ${format_when(m.revoked_at)}` : `last seen ${format_when(m.last_seen_at)}`}</td>
                    <td>{m.revoked_at ? <span className="muted">revoked</span> : <span>active</span>}</td>
                    <td>
                      {m.revoked_at ? (
                        <span className="muted small">—</span>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            set_revoke_id(m.id);
                            set_revoke_label(m.label || "this Forge");
                          }}
                          disabled={revoke_mutation.isPending}
                        >
                          Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted">
          {active.length} active · {machines.length - active.length} revoked
        </p>
      </div>
      <Dialog
        open={revoke_id !== null}
        onOpenChange={(open) => {
          if (!open) set_revoke_id(null);
        }}
        title="Revoke this machine?"
        description={revoke_id ? `This revokes ${revoke_label} (${revoke_id}). Assigned credentials stop working. This cannot be undone from here.` : undefined}
      >
        <div className="row">
          <Button variant="secondary" onClick={() => set_revoke_id(null)}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            disabled={revoke_mutation.isPending}
            onClick={() => {
              if (revoke_id && !revoke_mutation.isPending) revoke_mutation.mutate(revoke_id);
            }}
          >
            {revoke_mutation.isPending ? "Revoking…" : "Revoke machine"}
          </Button>
        </div>
      </Dialog>
    </section>
  );
};
