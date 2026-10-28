import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { Button, TextField } from "@artisanstreet/ui";
import { home_styles } from "../styles/home.ts";
import type { SignInFlow } from "./use-sign-in.ts";

type ApprovedFlow = Extract<SignInFlow, { _tag: "Approved" | "Finishing" }>;

export function FinishSignIn({ flow, on_finish }: Readonly<{
  flow: ApprovedFlow;
  on_finish: (totp_code?: string, recovery_code?: string) => void;
}>) {
  const [code, set_code] = useState("");
  const [use_recovery, set_use_recovery] = useState(false);
  const busy = flow._tag === "Finishing";
  return (
    <form {...stylex.props(home_styles.finish)} aria-label="Finish sign-in" onSubmit={(event) => {
      event.preventDefault();
      if (busy) return;
      on_finish(use_recovery ? undefined : code.trim() || undefined, use_recovery ? code.trim() : undefined);
    }}>
      <p {...stylex.props(home_styles.notice)} role="status">Email approved. Finish signing in here.</p>
      {flow.login.totp_required ? <>
        <TextField
          variant="bevel"
          id="signin-code"
          label={use_recovery ? "Recovery code" : "Authenticator code"}
          inputMode={use_recovery ? "text" : "numeric"}
          autoComplete={use_recovery ? "off" : "one-time-code"}
          required
          disabled={busy}
          value={code}
          onValueChange={set_code}
        />
        <Button variant="ghost" disabled={busy} onClick={() => {
          set_code("");
          set_use_recovery(value => !value);
        }}>{use_recovery ? "Use an authenticator code" : "Use a recovery code"}</Button>
      </> : null}
      <Button type="submit" disabled={busy}>{busy ? "Finishing…" : "Finish sign-in"}</Button>
      {flow._tag === "Approved" && flow.error ? <p role="alert" {...stylex.props(home_styles.notice)}>{flow.error}</p> : null}
    </form>
  );
}
