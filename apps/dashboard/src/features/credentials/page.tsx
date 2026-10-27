import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  artifacts_query_options,
  machines_query_options,
  provider_connections_query_options,
} from "@artisanstreet/core-client";
import { create_api_for_browser } from "../../lib/query-client.ts";
import { friendly_error } from "../../lib/friendly-error.ts";
import { format_when, short_id } from "../../lib/format.ts";
import { sign_in_url } from "../../lib/auth-redirect.ts";
import { Button, Dialog, Select, Spinner, TextField, use_toast } from "@artisanstreet/ui";

const PROVIDERS = [
  { value: "anthropic", label: "anthropic" },
  { value: "openai", label: "openai" },
  { value: "openrouter", label: "openrouter" },
  { value: "google", label: "google" },
] as const;

export const CredentialsPage = (): React.ReactElement => {
  const api = React.useMemo(() => create_api_for_browser(), []);
  const query_client = useQueryClient();
  const toast = use_toast();
  const [provider_value, set_provider_value] = React.useState<string>("anthropic");
  const [label_value, set_label_value] = React.useState("");
  const [secret_value, set_secret_value] = React.useState("");
  const [form_error, set_form_error] = React.useState<string | undefined>(undefined);
  const [revoke_id, set_revoke_id] = React.useState<string | null>(null);
  const [revoke_label, set_revoke_label] = React.useState("");
  const [assign_map, set_assign_map] = React.useState<Record<string, string>>({});

  const providers_query = useQuery({ ...provider_connections_query_options(api), retry: false });
  const machines_query = useQuery({ ...machines_query_options(api), retry: false });
  const artifacts_query = useQuery({ ...artifacts_query_options(api), retry: false });

  const invalidate_core = (): void => {
    void query_client.invalidateQueries({ queryKey: ["core"] });
  };

  const create_mutation = useMutation({
    mutationFn: () =>
      api.create_provider_connection(
        provider_value as "anthropic" | "openai" | "openrouter" | "google",
        label_value.trim(),
        secret_value,
      ),
    onSuccess: () => {
      set_secret_value("");
      set_label_value("");
      set_form_error(undefined);
      toast.push_toast({ title: "Connection stored", description: "Write-only secret, never shown again.", tone: "ok" });
      invalidate_core();
    },
    onError: (err) => set_form_error(friendly_error(err)),
  });

  const revoke_mutation = useMutation({
    mutationFn: (id: string) => api.revoke_provider_connection(id),
    onSuccess: () => {
      set_revoke_id(null);
      toast.push_toast({ title: "Connection revoked", tone: "ok" });
      invalidate_core();
    },
    onError: (err) => toast.push_toast({ title: "Revoke failed", description: friendly_error(err), tone: "err" }),
  });

  const assign_mutation = useMutation({
    mutationFn: ({ connection_id, machine_id }: { connection_id: string; machine_id: string }) =>
      api.assign_connection(connection_id, machine_id),
    onSuccess: () => {
      toast.push_toast({ title: "Machine assigned", tone: "ok" });
      invalidate_core();
    },
    onError: (err) => toast.push_toast({ title: "Assign failed", description: friendly_error(err), tone: "err" }),
  });

  const unassign_mutation = useMutation({
    mutationFn: ({ connection_id, machine_id }: { connection_id: string; machine_id: string }) =>
      api.unassign_connection(connection_id, machine_id),
    onSuccess: () => {
      toast.push_toast({ title: "Assignment removed", tone: "ok" });
      invalidate_core();
    },
    onError: (err) => toast.push_toast({ title: "Remove failed", description: friendly_error(err), tone: "err" }),
  });

  if (providers_query.isPending || machines_query.isPending) {
    return (
      <section aria-label="Credentials">
        <div className="page-head">
          <h1>Credentials</h1>
          <p>Loading connections…</p>
        </div>
        <div className="dash-panel" role="status">
          <Spinner label="Loading provider connections…" />
        </div>
      </section>
    );
  }

  const load_error = providers_query.error ?? machines_query.error;
  if (load_error) {
    if (load_error instanceof ApiError && load_error.status === 401) {
      if (typeof window !== "undefined") window.location.href = sign_in_url("/credentials");
      return (
        <section aria-label="Credentials">
          <div className="page-head">
            <h1>Credentials</h1>
            <p>Redirecting…</p>
          </div>
        </section>
      );
    }
    return (
      <section aria-label="Credentials">
        <div className="page-head">
          <h1>Credentials</h1>
          <p>Provider API keys and engine artifacts.</p>
        </div>
        <div className="dash-panel" role="alert">
          <p>{friendly_error(load_error)}</p>
        </div>
      </section>
    );
  }

  const connections = providers_query.data?.connections ?? [];
  const machines = (machines_query.data?.machines ?? []).filter((m) => !m.revoked_at);
  const artifacts = artifacts_query.data?.artifacts ?? [];

  const submit_create = (e: React.FormEvent): void => {
    e.preventDefault();
    if (create_mutation.isPending) return;
    if (secret_value.length === 0) {
      set_form_error("Paste the provider API key. It is sent once and never shown again.");
      return;
    }
    create_mutation.mutate();
  };

  return (
    <section aria-label="Credentials">
      <div className="page-head">
        <h1>Credentials</h1>
        <p>Provider API keys are write-only. Assign per machine; Core performs no OAuth and never returns the secret.</p>
      </div>
      <div className="dash-panel">
        <h2>Add a provider API key</h2>
        <form onSubmit={submit_create}>
          <Select label="Provider" items={[...PROVIDERS]} value={provider_value} onValueChange={set_provider_value} />
          <TextField label="Label" value={label_value} onValueChange={set_label_value} placeholder="cafe account" autoComplete="off" />
          <TextField
            label="API key (sent once, never shown again)"
            type="password"
            value={secret_value}
            onValueChange={set_secret_value}
            autoComplete="off"
            required
            error={form_error}
          />
          <p>
            <Button type="submit" variant="primary" disabled={create_mutation.isPending}>
              {create_mutation.isPending ? "Storing…" : "Store connection"}
            </Button>
          </p>
        </form>
      </div>
      <div className="dash-panel">
        <h2>Connections ({connections.length})</h2>
        {connections.length === 0 ? (
          <div className="state-box">No provider connections yet. Store a key above.</div>
        ) : (
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th>Connection</th>
                  <th>Assigned machines</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {connections.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {c.provider} — {c.label || "unnamed"}
                      <br />
                      <span className="mono small muted">{short_id(c.id)}</span>
                    </td>
                    <td>
                      {c.assigned_machine_ids.length === 0 ? <span className="muted small">unassigned</span> : null}
                      {c.assigned_machine_ids.map((mid) => (
                        <div key={mid} className="small">
                          <span className="mono">{short_id(mid)}</span>{" "}
                          {!c.revoked_at ? (
                            <Button
                              variant="ghost"
                              onClick={() => {
                                if (!unassign_mutation.isPending) unassign_mutation.mutate({ connection_id: c.id, machine_id: mid });
                              }}
                            >
                              remove
                            </Button>
                          ) : null}
                        </div>
                      ))}
                      {!c.revoked_at && machines.length > 0 ? (
                        <div className="row" style={{ marginTop: "0.5rem" }}>
                          <Select
                            label={`Assign ${c.label || c.provider}`}
                            items={machines.map((m) => ({ value: m.id, label: `${m.label || "Forge"} (${short_id(m.id)})` }))}
                            value={assign_map[c.id] ?? ""}
                            onValueChange={(next) => set_assign_map((prev) => ({ ...prev, [c.id]: next }))}
                            placeholder="choose a machine…"
                          />
                          <Button
                            variant="secondary"
                            onClick={() => {
                              const target = assign_map[c.id];
                              if (target && !assign_mutation.isPending) assign_mutation.mutate({ connection_id: c.id, machine_id: target });
                            }}
                            disabled={!assign_map[c.id] || assign_mutation.isPending}
                          >
                            Assign
                          </Button>
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {c.revoked_at ? (
                        <span className="muted small">revoked {format_when(c.revoked_at)}</span>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            set_revoke_id(c.id);
                            set_revoke_label(`${c.provider} — ${c.label || "unnamed"}`);
                          }}
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
      </div>
      <div className="dash-panel">
        <h2>Engine artifacts ({artifacts.length})</h2>
        <p className="muted small">Opaque credential envelopes from a harness local login. Core validates shape only; file bytes stay opaque. No OAuth connectors.</p>
        {artifacts_query.isPending ? <Spinner label="Loading artifacts…" /> : null}
        {artifacts_query.isError ? <p role="alert">{friendly_error(artifacts_query.error)}</p> : null}
        {artifacts_query.isSuccess && artifacts.length === 0 ? <div className="state-box">No artifacts stored.</div> : null}
        {artifacts.length > 0 ? (
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th>Artifact</th>
                  <th>Assigned</th>
                </tr>
              </thead>
              <tbody>
                {artifacts.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {a.engine} · {a.kind} · {a.label}
                      <br />
                      <span className="mono small muted">{short_id(a.id)}</span>
                    </td>
                    <td className="small">{a.assigned_machine_ids.length === 0 ? "unassigned" : a.assigned_machine_ids.map(short_id).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
      <Dialog
        open={revoke_id !== null}
        onOpenChange={(open) => {
          if (!open) set_revoke_id(null);
        }}
        title="Revoke this connection?"
        description={revoke_id ? `${revoke_label} stops working on all assigned machines. The stored secret is discarded.` : undefined}
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
            {revoke_mutation.isPending ? "Revoking…" : "Revoke connection"}
          </Button>
        </div>
      </Dialog>
    </section>
  );
};
