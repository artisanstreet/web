import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Effect, Match } from "effect";
import QRCode from "qrcode";
import { ApiError, deletion_status_query_options, me_query_options } from "@artisanstreet/core-client";
import { create_api_for_browser } from "../../lib/query-client.ts";
import { friendly_error } from "../../lib/friendly-error.ts";
import { format_when } from "../../lib/format.ts";
import { sign_in_url } from "../../lib/auth-redirect.ts";
import { Button, Dialog, Spinner, TextField, use_toast } from "@artisanstreet/ui";

type TotpState =
  | { readonly _tag: "Idle" }
  | { readonly _tag: "Enrolled"; readonly otpauth_url: string; readonly codes: ReadonlyArray<string>; readonly qr_svg: string | null };

export const SecurityPage = (): React.ReactElement => {
  const api = React.useMemo(() => create_api_for_browser(), []);
  const query_client = useQueryClient();
  const toast = use_toast();
  const [totp_state, set_totp_state] = React.useState<TotpState>({ _tag: "Idle" });
  const [verify_code, set_verify_code] = React.useState("");
  const [disable_code, set_disable_code] = React.useState("");
  const [deletion_code, set_deletion_code] = React.useState("");
  const [confirm_disable, set_confirm_disable] = React.useState(false);
  const [confirm_deletion, set_confirm_deletion] = React.useState(false);

  const me_query = useQuery({ ...me_query_options(api), retry: false });
  const deletion_query = useQuery({ ...deletion_status_query_options(api), retry: false });

  const invalidate_core = (): void => {
    void query_client.invalidateQueries({ queryKey: ["core"] });
  };

  const enroll_mutation = useMutation({
    mutationFn: () => api.enroll_totp(),
    onSuccess: (res) => {
      const program = Effect.gen(function* () {
        const svg = yield* Effect.tryPromise({
          try: () => QRCode.toString(res.otpauth_url, { type: "svg", margin: 1, width: 180 }),
          catch: () => null as string | null,
        }).pipe(Effect.catchAll(() => Effect.succeed(null as string | null)));
        return { svg, codes: res.recovery_codes, url: res.otpauth_url };
      });
      void Effect.runPromise(program).then(({ svg, codes, url }) => {
        set_totp_state({ _tag: "Enrolled", otpauth_url: url, codes, qr_svg: svg });
      });
    },
    onError: (err) => toast.push_toast({ title: "Enrollment failed", description: friendly_error(err), tone: "err" }),
  });

  const verify_mutation = useMutation({
    mutationFn: (code: string) => api.verify_totp(code),
    onSuccess: () => {
      toast.push_toast({ title: "Two-step sign-in is on", tone: "ok" });
      // Clear one-time state immediately.
      set_totp_state({ _tag: "Idle" });
      set_verify_code("");
      invalidate_core();
    },
    onError: (err) => toast.push_toast({ title: "Confirm failed", description: friendly_error(err), tone: "err" }),
  });

  const disable_mutation = useMutation({
    mutationFn: (code: string) => api.disable_totp(code),
    onSuccess: () => {
      toast.push_toast({ title: "Two-step sign-in is off", tone: "ok" });
      set_confirm_disable(false);
      set_disable_code("");
      invalidate_core();
    },
    onError: (err) => toast.push_toast({ title: "Disable failed", description: friendly_error(err), tone: "err" }),
  });

  const request_deletion_mutation = useMutation({
    mutationFn: (totp_code?: string) => api.request_deletion(totp_code),
    onSuccess: () => {
      toast.push_toast({ title: "Deletion requested", tone: "ok" });
      set_confirm_deletion(false);
      set_deletion_code("");
      invalidate_core();
    },
    onError: (err) => toast.push_toast({ title: "Request failed", description: friendly_error(err), tone: "err" }),
  });

  const cancel_deletion_mutation = useMutation({
    mutationFn: () => api.cancel_deletion(),
    onSuccess: () => {
      toast.push_toast({ title: "Deletion cancelled", tone: "ok" });
      invalidate_core();
    },
    onError: (err) => toast.push_toast({ title: "Cancel failed", description: friendly_error(err), tone: "err" }),
  });

  if (me_query.isPending) {
    return (
      <section aria-label="Security">
        <div className="page-head">
          <h1>Security</h1>
          <p>Loading…</p>
        </div>
        <div className="dash-panel" role="status">
          <Spinner label="Loading security status…" />
        </div>
      </section>
    );
  }

  if (me_query.isError) {
    const err = me_query.error;
    if (err instanceof ApiError && err.status === 401) {
      if (typeof window !== "undefined") window.location.href = sign_in_url("/security");
      return (
        <section aria-label="Security">
          <div className="page-head">
            <h1>Security</h1>
            <p>Redirecting…</p>
          </div>
        </section>
      );
    }
    return (
      <section aria-label="Security">
        <div className="page-head">
          <h1>Security</h1>
          <p>Two-step sign-in and account deletion.</p>
        </div>
        <div className="dash-panel" role="alert">
          <p>{friendly_error(err)}</p>
        </div>
      </section>
    );
  }

  const totp_on = me_query.data.totp_enrolled;
  const deletion = deletion_query.data;

  return (
    <section aria-label="Security">
      <div className="page-head">
        <h1>Security</h1>
        <p>Optional authenticator plus one-time recovery codes. Email alone never bypasses it.</p>
      </div>
      <div className="dash-panel">
        <h2>Two-step sign-in: {totp_on ? "on" : "off"}</h2>
        {!totp_on ? (
          <div>
            <p className="muted small">Enroll an authenticator. Recovery codes show once — write them down.</p>
            <Button variant="primary" onClick={() => enroll_mutation.mutate()} disabled={enroll_mutation.isPending}>
              {enroll_mutation.isPending ? "Starting…" : "Start enrollment"}
            </Button>
            {Match.value(totp_state).pipe(
              Match.tag("Idle", () => null),
              Match.tag("Enrolled", (s) => (
                <div>
                  <p>Scan the code or enter details manually:</p>
                  {s.qr_svg ? (
                    <div dangerouslySetInnerHTML={{ __html: s.qr_svg }} role="img" aria-label="Authenticator setup code" />
                  ) : (
                    <p className="muted small">QR did not render — use the otpauth URL below.</p>
                  )}
                  <p className="small mono">{s.otpauth_url}</p>
                  <p>Recovery codes — write these down now. Each works once:</p>
                  <ul>
                    {s.codes.map((c) => (
                      <li key={c} className="mono">
                        {c}
                      </li>
                    ))}
                  </ul>
                  <TextField
                    label="Code from your authenticator"
                    value={verify_code}
                    onValueChange={set_verify_code}
                    autoComplete="one-time-code"
                    description="6 digits, time-based."
                  />
                  <p>
                    <Button
                      variant="primary"
                      onClick={() => verify_mutation.mutate(verify_code.trim())}
                      disabled={verify_mutation.isPending || verify_code.trim().length === 0}
                    >
                      {verify_mutation.isPending ? "Confirming…" : "Confirm enrollment"}
                    </Button>
                  </p>
                </div>
              )),
              Match.exhaustive,
            )}
          </div>
        ) : (
          <div>
            <TextField
              label="Authenticator code to disable"
              value={disable_code}
              onValueChange={set_disable_code}
              autoComplete="one-time-code"
              description="Confirm with a current code."
            />
            <p>
              <Button variant="secondary" onClick={() => set_confirm_disable(true)} disabled={disable_code.trim().length === 0}>
                Disable two-step
              </Button>
            </p>
          </div>
        )}
      </div>
      <div className="dash-panel">
        <h2>Account deletion</h2>
        {deletion_query.isPending ? <Spinner label="Loading deletion status…" /> : null}
        {deletion_query.isError ? <p role="alert">{friendly_error(deletion_query.error)}</p> : null}
        {deletion ? (
          <dl className="kv">
            <dt>Status</dt>
            <dd>{deletion.status}</dd>
            <dt>Requested</dt>
            <dd>{deletion.requested_at ? format_when(deletion.requested_at) : "—"}</dd>
            <dt>Purge after</dt>
            <dd>{deletion.purge_after ? format_when(deletion.purge_after) : "—"}</dd>
          </dl>
        ) : null}
        {deletion?.status === "pending" ? (
          <p>
            <Button variant="secondary" onClick={() => cancel_deletion_mutation.mutate()} disabled={cancel_deletion_mutation.isPending}>
              {cancel_deletion_mutation.isPending ? "Cancelling…" : "Cancel deletion request"}
            </Button>
          </p>
        ) : (
          <div>
            <TextField
              label="Authenticator code (if enrolled)"
              value={deletion_code}
              onValueChange={set_deletion_code}
              autoComplete="off"
              description="Required only when two-step is on."
            />
            <p>
              <Button variant="secondary" onClick={() => set_confirm_deletion(true)}>
                Request account deletion
              </Button>
            </p>
          </div>
        )}
      </div>
      <Dialog
        open={confirm_disable}
        onOpenChange={(open) => {
          if (!open) set_confirm_disable(false);
        }}
        title="Disable two-step sign-in?"
        description="Email-only sign-in resumes. Recovery codes stop working."
      >
        <div className="row">
          <Button variant="secondary" onClick={() => set_confirm_disable(false)}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            disabled={disable_mutation.isPending}
            onClick={() => {
              if (!disable_mutation.isPending) disable_mutation.mutate(disable_code.trim());
            }}
          >
            {disable_mutation.isPending ? "Disabling…" : "Disable"}
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={confirm_deletion}
        onOpenChange={(open) => {
          if (!open) set_confirm_deletion(false);
        }}
        title="Request account deletion?"
        description="This schedules your account, machines, credentials, and bundles for purge. Cancel any time before purge_after."
      >
        <div className="row">
          <Button variant="secondary" onClick={() => set_confirm_deletion(false)}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            disabled={request_deletion_mutation.isPending}
            onClick={() => {
              if (!request_deletion_mutation.isPending) request_deletion_mutation.mutate(deletion_code.trim() || undefined);
            }}
          >
            {request_deletion_mutation.isPending ? "Requesting…" : "Request deletion"}
          </Button>
        </div>
      </Dialog>
    </section>
  );
};
