import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import { TextField } from "@artisanstreet/ui";
import { home_styles } from "../styles/home.ts";
import { Mail } from "../icons/mail.tsx";
import { AttachedAction } from "./action.tsx";
import "./motion.css";

import { useSignIn } from "./use-sign-in.ts";
import { FinishSignIn } from "./finish.tsx";

export function SignInForm({ return_to }: Readonly<{ return_to?: string }>) {
  const [email, set_email] = useState("");
  const { flow, request_link, finish_sign_in } = useSignIn(return_to);
  const settled = flow._tag === "Waiting" || flow._tag === "Failed" || flow._tag === "Expired";
  const message = flow._tag === "Waiting" || flow._tag === "Failed" ? flow.message
    : flow._tag === "Expired" ? "This sign-in link expired. Request a fresh one." : "";
  const feedback = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const block = feedback.current;
    if (!block) return;
    if (settled) {
      block.classList.remove("is-hiding", "is-shown");
      void block.offsetHeight;
      block.classList.add("is-shown");
      return;
    }
    if (!block.classList.contains("is-shown")) return;
    block.classList.add("is-hiding");
    block.classList.remove("is-shown");
    const line = block.firstElementChild;
    const seconds = (line ? Number.parseFloat(getComputedStyle(line).transitionDuration) : 0) || 0;
    const timeout = window.setTimeout(() => block.classList.remove("is-hiding"), seconds * 1000);
    return () => window.clearTimeout(timeout);
  }, [settled]);

  return (
    <div {...stylex.props(home_styles.signin_group)}>
      <form
        {...stylex.props(home_styles.signin)}
        aria-label="Sign in"
        onSubmit={(event) => {
          event.preventDefault();
          request_link(email);
        }}
      >
        <TextField
          variant="bevel"
          size="lg"
          xstyle={home_styles.field}
          input_style={home_styles.input}
          leading_icon={<Mail size={20} />}
          id="signin-email"
          name="email"
          label="Email"
          hide_label
          required
          type="email"
          autoComplete="email"
          placeholder="you@artisan.email"
          disabled={flow._tag === "Finishing"}
          value={email}
          onValueChange={set_email}
        />
        <AttachedAction pending={flow._tag === "Sending"} disabled={flow._tag === "Finishing"} />
        <div {...stylex.props(home_styles.feedback, settled && home_styles.feedback_visible)}>
          <div
            ref={feedback}
            className="t-stagger"
            role={flow._tag === "Failed" ? "alert" : "status"}
          >
            <span className="t-stagger-line" aria-hidden={!settled}>
              {message}
            </span>
          </div>
        </div>
      </form>
      {flow._tag === "Approved" || flow._tag === "Finishing" ?
        <FinishSignIn key={flow.login.request_id} flow={flow} on_finish={finish_sign_in} /> : null}
    </div>
  );
}
