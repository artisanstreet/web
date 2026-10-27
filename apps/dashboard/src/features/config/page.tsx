import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Either, Match } from "effect";
import { ApiError, C, decode_strict, humanize_validation_error, latest_bundle_query_options } from "@artisanstreet/core-client";
import { create_api_for_browser } from "../../lib/query-client.ts";
import { friendly_error } from "../../lib/friendly-error.ts";
import { format_when } from "../../lib/format.ts";
import { sign_in_url } from "../../lib/auth-redirect.ts";
import { Button, Spinner, TextField, use_toast } from "@artisanstreet/ui";

const EXAMPLE_MANIFEST = `{
  "format": "ast-editor-config/1",
  "mcpServers": [{ "name": "artisan", "command": "ae", "args": ["mcp"] }],
  "skills": [{ "name": "plan", "source": "builtin" }]
}`;

type ParsedManifest = { readonly _tag: "Ok"; readonly value: typeof C.EditorManifest.Type } | { readonly _tag: "Err"; readonly message: string };

const parse_manifest = (raw: string): ParsedManifest =>
  Match.value(Either.try({ try: () => JSON.parse(raw) as unknown, catch: (err: unknown) => err })).pipe(
    Match.when({ _tag: "Left" }, () => ({ _tag: "Err", message: "Not valid JSON." }) as ParsedManifest),
    Match.when({ _tag: "Right" }, ({ right }) =>
      Match.value(Either.try({ try: () => decode_strict(C.EditorManifest, right), catch: (err: unknown) => err })).pipe(
        Match.when({ _tag: "Left" }, ({ left }) => ({ _tag: "Err", message: humanize_validation_error(left) }) as ParsedManifest),
        Match.when({ _tag: "Right" }, ({ right: value }) => ({ _tag: "Ok", value }) as ParsedManifest),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );

export const ConfigPage = (): React.ReactElement => {
  const api = React.useMemo(() => create_api_for_browser(), []);
  const query_client = useQueryClient();
  const toast = use_toast();
  const [manifest_text, set_manifest_text] = React.useState(EXAMPLE_MANIFEST);
  const [form_error, set_form_error] = React.useState<string | undefined>(undefined);
  const [machine_value, set_machine_value] = React.useState("");

  const latest_query = useQuery({ ...latest_bundle_query_options(api), retry: false });
  const state_query = useQuery({
    queryKey: ["core", "config", "state", machine_value.trim()],
    queryFn: () => api.config_state(machine_value.trim()),
    retry: false,
    enabled: machine_value.trim().length > 0,
  });

  const publish_mutation = useMutation({
    mutationFn: (manifest: typeof C.EditorManifest.Type) => api.publish_bundle(manifest),
    onSuccess: (info) => {
      set_form_error(undefined);
      toast.push_toast({ title: `Published version ${info.version}`, tone: "ok" });
      void query_client.invalidateQueries({ queryKey: ["core"] });
    },
    onError: (err) => set_form_error(friendly_error(err)),
  });

  const submit_publish = (e: React.FormEvent): void => {
    e.preventDefault();
    if (publish_mutation.isPending) return;
    const parsed = parse_manifest(manifest_text);
    if (parsed._tag === "Err") {
      set_form_error(parsed.message);
      return;
    }
    publish_mutation.mutate(parsed.value);
  };

  if (latest_query.isPending) {
    return (
      <section aria-label="Configuration">
        <div className="page-head">
          <h1>Configuration</h1>
          <p>Loading latest bundle…</p>
        </div>
        <div className="dash-panel" role="status">
          <Spinner label="Loading bundle…" />
        </div>
      </section>
    );
  }

  if (latest_query.isError) {
    const err = latest_query.error;
    if (err instanceof ApiError && err.status === 401) {
      if (typeof window !== "undefined") window.location.href = sign_in_url("/config");
      return (
        <section aria-label="Configuration">
          <div className="page-head">
            <h1>Configuration</h1>
            <p>Redirecting…</p>
          </div>
        </section>
      );
    }
    return (
      <section aria-label="Configuration">
        <div className="page-head">
          <h1>Configuration</h1>
          <p>Versioned MCP and skill bundles.</p>
        </div>
        <div className="dash-panel" role="alert">
          <p>{friendly_error(err)}</p>
        </div>
      </section>
    );
  }

  const bundle = latest_query.data.bundle;
  const manifest = latest_query.data.manifest;

  return (
    <section aria-label="Configuration">
      <div className="page-head">
        <h1>Configuration</h1>
        <p>Versioned bundles: MCP servers, skills, and the global prompt. Requests use camelCase; responses are snake_case.</p>
      </div>
      <div className="dash-panel">
        <h2>Latest bundle</h2>
        {!bundle || !manifest ? (
          <div className="state-box">No bundle published yet. Publish one below.</div>
        ) : (
          <dl className="kv">
            <dt>Version</dt>
            <dd>
              v{bundle.version} · published {format_when(bundle.created_at)}
            </dd>
            <dt>Content hash</dt>
            <dd className="mono">{bundle.content_hash}</dd>
            <dt>MCP servers</dt>
            <dd>{typeof manifest === "object" && manifest && "mcp_servers" in manifest ? (manifest as unknown as { readonly mcp_servers: ReadonlyArray<unknown> }).mcp_servers.length : 0}</dd>
            <dt>Skills</dt>
            <dd>{typeof manifest === "object" && manifest && "skills" in manifest ? (manifest as unknown as { readonly skills: ReadonlyArray<unknown> }).skills.length : 0}</dd>
          </dl>
        )}
      </div>
      <div className="dash-panel">
        <h2>Publish a bundle</h2>
        <p className="muted small">Paste manifest JSON matching the contract; unknown fields are rejected. Forges fetch the latest version and report what they applied.</p>
        <form onSubmit={submit_publish}>
          {/* NOTE to ROOT: need shared TextArea/multiline TextField in @artisanstreet/ui.
              Using native textarea + art-input class (shared component CSS) until provided. */}
          <div className="art-field">
            <label className="art-field-label" htmlFor="bundle-json">
              Manifest JSON (camelCase request)
            </label>
            <textarea
              id="bundle-json"
              className="art-input"
              style={{ minHeight: "12rem", fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
              spellCheck={false}
              value={manifest_text}
              onChange={(e) => set_manifest_text(e.target.value)}
              rows={10}
              aria-invalid={form_error ? true : undefined}
              aria-describedby={form_error ? "bundle-json-error" : undefined}
            />
            <span className="art-field-hint">Strict decode: unknown fields rejected client-side before send.</span>
            {form_error ? (
              <span id="bundle-json-error" className="art-field-error" role="alert">
                {form_error}
              </span>
            ) : null}
          </div>
          <p>
            <Button type="submit" variant="primary" disabled={publish_mutation.isPending}>
              {publish_mutation.isPending ? "Publishing…" : "Validate + publish"}
            </Button>
          </p>
        </form>
      </div>
      <div className="dash-panel">
        <h2>Machine state</h2>
        <TextField label="Forge id" value={machine_value} onValueChange={set_machine_value} placeholder="mch_…" autoComplete="off" />
        {state_query.isPending && machine_value.trim().length > 0 ? <Spinner label="Reading state…" /> : null}
        {state_query.isError ? <p role="alert">{friendly_error(state_query.error)}</p> : null}
        {state_query.isSuccess ? (
          <p>
            Bundle {state_query.data.bundle_id}: {state_query.data.status}
            <br />
            <span className="small muted">applied {format_when(state_query.data.applied_at)}</span>
          </p>
        ) : null}
      </div>
    </section>
  );
};
