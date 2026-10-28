import * as stylex from "@stylexjs/stylex";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { create_core_api } from "@artisanstreet/core-client";
import { TextField } from "@artisanstreet/ui";
import { CORE_API_BASE } from "../lib/env.ts";
import { store_request_secret } from "../lib/auth/storage.ts";
import { friendly_error } from "../lib/friendly-error.ts";
import { home_styles } from "../styles/home.ts";
import { Mail } from "../icons/mail.tsx";
import { AttachedAction } from "./action.tsx";
import "./motion.css";

const success_message = "We have sent an email to your inbox. Check spam aswell!";

export function SignInForm() {
  const [email, set_email] = useState("");
  const api = useMemo(() => create_core_api(CORE_API_BASE), []);
  const request = useMutation({
    mutationFn: (email: string) => api.request_magic_link(email),
    onSuccess: ({ request_id, request_secret }) => {
      store_request_secret(request_id, request_secret);
    },
  });
  const settled = request.isSuccess || request.isError;
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
    <form
      {...stylex.props(home_styles.signin)}
      aria-label="Sign in"
      onSubmit={(event) => {
        event.preventDefault();
        if (request.isPending) return;
        request.mutate(email.trim());
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
        value={email}
        onValueChange={set_email}
      />
      <AttachedAction pending={request.isPending} />
      <div {...stylex.props(home_styles.feedback)}>
        <div
          ref={feedback}
          className="t-stagger"
          role={request.isError ? "alert" : "status"}
        >
          <span className="t-stagger-line" aria-hidden={!settled}>
            {request.isError ? friendly_error(request.error) : success_message}
          </span>
        </div>
      </div>
    </form>
  );
}
