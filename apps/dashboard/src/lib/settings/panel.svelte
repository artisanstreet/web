<script lang="ts" effect>
  import { Effect, Option } from "effect";
  import { page } from "$app/state";
  import { VITE_AUTH_URL } from "$app/env/public";
  import type { CoreApi, CoreFailure } from "@artisanstreet/core-client";
  import Section from "./section.svelte";
  import Card from "../card/card.svelte";
  import { info_of, Pane } from "./pane.ts";
  import Row from "./row.svelte";
  import Button from "./button.svelte";
  import CodeField from "./code-field.svelte";
  import Qr from "./qr.svelte";
  import Profile from "./profile.svelte";
  import { account_of, upgrade_target } from "../account/account.ts";
  import { after_sign_out, sign_out } from "../account/session.ts";
  import { theme_state, Theme } from "../theme/state.svelte.ts";
  import { friendly_error } from "./messages.ts";
  import {
    cancel_deletion,
    confirm_enrollment,
    enable_email,
    load_snapshot,
    remove_method,
    request_deletion,
    revoke_session,
    sign_out_everywhere,
    start_enrollment,
    turn_off_totp,
    type Enrollment,
  } from "./actions.ts";
  import {
    Deletion,
    deletion_of,
    format_day,
    format_when,
    kind_names,
    link_notice_of,
    live_sessions,
    last_active,
    method_rows,
    MethodRow,
    Notice,
    notice_in,
    session_title,
    Settings,
    type Kind,
    type Section as SectionKey,
  } from "./model.ts";
  import fallback_glyph from "../assets/user.svg?url";
  import google_glyph from "../assets/google.svg?url";
  import github_glyph from "../assets/github.svg?url";

  const auth_origin = VITE_AUTH_URL.replace(/\/+$/, "");
  let { pane }: { pane: Pane } = $props();

  const info = $derived(info_of(pane));
  const link_url = (kind: Kind, account_id: string) =>
    `${auth_origin}/link?${new URLSearchParams({ provider: kind, account: account_id, return_to: `${page.url.pathname}?settings=sign-in` })}`;

  let settings: Settings = $state(Settings.Loading());
  let notice: Option.Option<Notice> = $state(link_notice_of(page.url));
  let busy = $state(false);
  let enrollment: Option.Option<Enrollment> = $state(Option.none());
  let turning_off = $state(false);
  let removing: Option.Option<Kind> = $state(Option.none());
  let deleting = $state(false);
  let code = $state("");
  let scroll_above = $state(false);
  let scroll_below = $state(false);

  const track_session_scroll = (node: HTMLElement) => {
    const update = () => {
      scroll_above = node.scrollTop > 1;
      scroll_below = node.scrollTop + node.clientHeight < node.scrollHeight - 1;
    };
    const observer = new ResizeObserver(update);
    observer.observe(node);
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    node.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      node.removeEventListener("scroll", update);
    };
  };

  settings = yield* load_snapshot.pipe(
    Effect.map((snapshot) => Settings.Ready({ snapshot })),
    Effect.catch((failure) => Effect.succeed(Settings.Failed({ message: friendly_error(failure) }))),
  );

  const reset = () => {
    enrollment = Option.none();
    turning_off = false;
    removing = Option.none();
    deleting = false;
    code = "";
  };

  const act = (section: SectionKey, work: Effect.Effect<void, CoreFailure, CoreApi>, done: string | null) =>
    Effect.gen(function* () {
      busy = true;
      notice = Option.none();
      yield* work;
      const snapshot = yield* load_snapshot;
      settings = Settings.Ready({ snapshot });
      reset();
      notice = Option.fromNullishOr(done).pipe(Option.map((message) => Notice.Done({ section, message })));
    }).pipe(
      Effect.catch((failure) =>
        Effect.sync(() => {
          notice = Option.some(Notice.Failed({ section, message: friendly_error(failure) }));
        }),
      ),
      Effect.ensuring(Effect.sync(() => (busy = false))),
    );

  const begin_enrollment = Effect.gen(function* () {
    busy = true;
    notice = Option.none();
    enrollment = Option.some(yield* start_enrollment);
    code = "";
  }).pipe(
    Effect.catch((failure) =>
      Effect.sync(() => {
        notice = Option.some(Notice.Failed({ section: "security", message: friendly_error(failure) }));
      }),
    ),
    Effect.ensuring(Effect.sync(() => (busy = false))),
  );

  const leave_everywhere = Effect.gen(function* () {
    busy = true;
    yield* sign_out_everywhere;
    yield* after_sign_out;
  }).pipe(
    Effect.catch((failure) =>
      Effect.sync(() => {
        busy = false;
        notice = Option.some(Notice.Failed({ section: "sessions", message: friendly_error(failure) }));
      }),
    ),
  );

  const ask = (next: () => void) => () => {
    reset();
    notice = Option.none();
    next();
  };
</script>


{#snippet feedback(section: SectionKey)}
  {@const found = notice_in(section)(notice)}
  {#if Option.isSome(found)}
    <p class="notice" data-tone={found.value._tag} role={Notice.$is("Failed")(found.value) ? "alert" : "status"}>
      {found.value.message}
    </p>
  {/if}
{/snippet}

{#snippet portrait(picture: Option.Option<string>)}
  <span class="portrait" aria-hidden="true">
    {#if Option.isSome(picture)}
      <img src={picture.value} alt="" width="96" height="96" referrerpolicy="no-referrer" />
    {:else}
      <span class="glyph" style:--icon={`url("${fallback_glyph}")`}></span>
    {/if}
  </span>
{/snippet}

<div class="pane" data-sessions={Pane.$is("Sessions")(pane) || undefined} data-profile={Pane.$is("Profile")(pane) || undefined}>
  <header>
    <h2>{info.label}</h2>
    <p>{info.description}</p>
  </header>
  {#if Settings.$is("Loading")(settings)}
    <p class="quiet" role="status">Loading your settings…</p>
  {:else if Settings.$is("Failed")(settings)}
    <p class="notice" data-tone="Failed" role="alert">{settings.message}</p>
  {:else}
    {@const snapshot = settings.snapshot}
    {@const account = account_of(snapshot.me)}
    {@const upgrade = upgrade_target(account.plan)}
    {@const totp_on = snapshot.me.totp_enrolled}
    {@const sessions = live_sessions(snapshot.sessions, Date.now())}
    {@const deletion = deletion_of(snapshot.deletion)}

    {#if Pane.$is("Profile")(pane)}
      <Profile {snapshot} />
    {/if}

    {#if Pane.$is("Appearance")(pane)}
      <Section>
        <Row title="Theme" detail={Theme.$is("Dark")(theme_state.current) ? "Dark" : "Light"}>
          {#snippet action()}
            <div class="segments-card"><Card surface="var(--bg)" radius="var(--radius-sm)">
            <div class="segments" role="radiogroup" aria-label="Theme">
              {#each [Theme.Dark(), Theme.Light()] as choice (choice._tag)}
                <button
                  type="button"
                  role="radio"
                  aria-checked={choice._tag === theme_state.current._tag}
                  onclick={() => theme_state.choose(choice)}
                >
                  {choice._tag}
                </button>
              {/each}
            </div>
            </Card></div>
          {/snippet}
        </Row>
      </Section>
    {/if}

    {#if Pane.$is("Plan")(pane)}
      <Section>
        <Row title={account.plan._tag} detail="Your current plan.">
          {#snippet action()}
            {#if Option.isSome(upgrade)}
              <Button tone="sand">Upgrade to {upgrade.value._tag}</Button>
            {/if}
          {/snippet}
        </Row>
      </Section>
    {/if}

    {#if Pane.$is("SignIn")(pane)}
      <Section>
        {#each method_rows(snapshot.methods) as method (method.kind)}
          {@const kind = method.kind}
          {@const confirming = Option.contains(removing, kind)}
          <Row
            title={kind_names[kind]}
            detail={MethodRow.$match(method, {
              Linked: ({ since }) =>
                kind === "email" ? `${snapshot.methods.email} · since ${format_day(since)}` : `Linked ${format_day(since)}`,
              Unlinked: () => (kind === "email" ? "Off" : "Not linked"),
            })}
          >
            {#snippet leading()}
              {#if kind === "email"}
                <svg class="method-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M4 5h16a2 2 0 0 1 2 2v.2l-10 6-10-6V7a2 2 0 0 1 2-2Zm-2 4.5 9.49 5.7a1 1 0 0 0 1.02 0L22 9.5V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5Z"/></svg>
              {:else}
                <span class="method-icon provider-icon" style:--icon={`url("${kind === "google" ? google_glyph : github_glyph}")`} aria-hidden="true"></span>
              {/if}
            {/snippet}
            {#snippet action()}
              {#if MethodRow.$is("Linked")(method)}
                {#if !confirming}
                  <div class="method-action"><Card surface="var(--bg)" radius="var(--radius-sm)"><Button disabled={busy || !method.removable} title={!method.removable ? "Keep at least one sign-in method" : undefined} onclick={ask(() => (removing = Option.some(kind)))}>{kind === "email" ? "Turn off" : "Unlink"}</Button></Card></div>
                {/if}
              {:else if kind === "email"}
                <div class="method-action"><Card surface="var(--bg)" radius="var(--radius-sm)"><Button disabled={busy} onclick={yield* act("methods", enable_email, "Email links work again.")}>
                  Turn on
                </Button></Card></div>
              {:else}
                <div class="method-action"><Card surface="var(--bg)" radius="var(--radius-sm)"><a class="link-button" href={link_url(kind, snapshot.me.account_id)}>Link</a></Card></div>
              {/if}
            {/snippet}
            {#if confirming}
              <div class="confirm">
                <p>
                  You won't be able to sign in with {kind_names[kind]} anymore.
                  {totp_on ? "Confirm with a code from your authenticator." : ""}
                </p>
                {#if totp_on}
                  <CodeField id="remove-code" label="Authenticator code" bind:value={code} readonly={busy} />
                {/if}
                <div class="buttons">
                  <Button
                    tone="danger"
                    disabled={busy}
                    onclick={yield* act("methods", remove_method(kind, code), `${kind_names[kind]} is removed.`)}
                  >
                    Remove {kind_names[kind]}
                  </Button>
                  <Button disabled={busy} onclick={reset}>Cancel</Button>
                </div>
              </div>
            {/if}
          </Row>
        {/each}
        {@render feedback("methods")}
      </Section>
    {/if}

    {#if Pane.$is("TwoStep")(pane)}
      <Section>
        <Row
          title={totp_on ? "On" : "Off"}
          detail={totp_on ? "Every sign-in needs a code." : "Signing in only needs your email link or provider."}
        >
          {#snippet action()}
            {#if totp_on && !turning_off}
              <Button disabled={busy} onclick={ask(() => (turning_off = true))}>Turn off</Button>
            {:else if !totp_on && Option.isNone(enrollment)}
              <Button tone="sand" disabled={busy} onclick={yield* begin_enrollment}>Set up</Button>
            {/if}
          {/snippet}
          {#if Option.isSome(enrollment)}
            <div class="enroll">
              <Qr cells={enrollment.value.qr} />
              <div class="steps">
                <p>Scan this with your authenticator app, then enter the code it shows.</p>
                <details>
                  <summary>Can't scan it?</summary>
                  <code class="secret">{enrollment.value.otpauth_url}</code>
                </details>
                <CodeField id="enroll-code" label="Authenticator code" bind:value={code} readonly={busy} />
              </div>
            </div>
            <div class="recovery">
              <p>
                Recovery codes. Each one signs you in once if you lose your authenticator. Save them somewhere
                safe; they won't be shown again.
              </p>
              <ul>
                {#each enrollment.value.recovery_codes as recovery (recovery)}
                  <li><code>{recovery}</code></li>
                {/each}
              </ul>
            </div>
            <div class="buttons">
              <Button
                tone="sand"
                disabled={busy || code.trim() === ""}
                onclick={yield* act("security", confirm_enrollment(code), "Two-step sign-in is on.")}
              >
                Turn on
              </Button>
              <Button disabled={busy} onclick={reset}>Cancel</Button>
            </div>
          {:else if turning_off}
            <div class="confirm">
              <p>Signing in will only need your email link or provider. Your recovery codes stop working.</p>
              <CodeField id="disable-code" label="Authenticator code" bind:value={code} readonly={busy} />
              <div class="buttons">
                <Button
                  tone="danger"
                  disabled={busy || code.trim() === ""}
                  onclick={yield* act("security", turn_off_totp(code), "Two-step sign-in is off.")}
                >
                  Turn off
                </Button>
                <Button disabled={busy} onclick={reset}>Cancel</Button>
              </div>
            </div>
          {/if}
        </Row>
        {@render feedback("security")}
      </Section>
    {/if}

    {#if Pane.$is("Sessions")(pane)}
      <div class="session-surface">
      <Card surface="var(--card-inner)" radius="var(--radius-md)">
      <div class="session-content">
      <div class="session-list-frame">
      <div class="session-list" {@attach track_session_scroll}>
        <div class="session-rows">
        {#each sessions as session (session.id)}
          <Row
            title={session_title(session)}
            detail={last_active(session.last_seen_at, Date.now())}
          >
            {#snippet title_extra()}
              {#if session.is_current}<span class="you-badge">You</span>{/if}
            {/snippet}
            {#snippet action()}
              {#if !session.is_current}
                <button class="remove-session" type="button" disabled={busy} aria-label={`Sign out ${session_title(session)} session`} title="Sign out this session" onclick={yield* act("sessions", revoke_session(session.id), null)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" /></svg>
                </button>
              {/if}
            {/snippet}
          </Row>
        {/each}
        </div>
      </div>
      <div class="scroll-fade top" data-visible={scroll_above} aria-hidden="true"></div>
      <div class="scroll-fade bottom" data-visible={scroll_below} aria-hidden="true"></div>
      </div>
      <div class="session-footer">
        <div class="session-well inset-shadow">
          <Row title="Sign out" detail="End this browser's session, or every session at once.">
            {#snippet action()}
              <Button tone="sand" disabled={busy} onclick={yield* sign_out}>
                This browser
              </Button>
              <Button tone="solid-danger" disabled={busy} onclick={yield* leave_everywhere}>
                Everywhere
              </Button>
            {/snippet}
          </Row>
          {@render feedback("sessions")}
        </div>
      </div>
      </div>
      </Card>
      </div>
    {/if}

    {#if Pane.$is("Delete")(pane)}
      <Section>
        {#if Deletion.$is("Scheduled")(deletion)}
          <Row title="Deletion scheduled" detail={`Your account will be deleted on ${format_day(deletion.purge_after)}.`}>
            {#snippet action()}
              <Button
                tone="sand"
                disabled={busy}
                onclick={yield* act("danger", cancel_deletion, "Deletion cancelled. Your account stays.")}
              >
                Keep my account
              </Button>
            {/snippet}
          </Row>
        {:else}
          <Row title="Delete account" detail="There's a grace period, and you can cancel during it.">
            {#snippet action()}
              {#if !deleting}
                <Button tone="danger" disabled={busy} onclick={ask(() => (deleting = true))}>Delete…</Button>
              {/if}
            {/snippet}
            {#if deleting}
              <div class="confirm">
                <p>
                  Your account, machines and keys will be deleted after a grace period. You can cancel until then.
                </p>
                {#if totp_on}
                  <CodeField id="delete-code" label="Authenticator code" bind:value={code} readonly={busy} />
                {/if}
                <div class="buttons">
                  <Button
                    tone="danger"
                    disabled={busy || (totp_on && code.trim() === "")}
                    onclick={yield* act("danger", request_deletion(code), "Deletion scheduled.")}
                  >
                    Delete my account
                  </Button>
                  <Button disabled={busy} onclick={reset}>Cancel</Button>
                </div>
              </div>
            {/if}
          </Row>
        {/if}
        {@render feedback("danger")}
      </Section>
    {/if}
  {/if}
</div>

<style>
  .pane {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
  }

  .pane[data-sessions],
  .pane[data-profile] {
    flex: 1;
    gap: var(--sp-3);
    min-height: 0;
  }

  .session-surface {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .session-surface > :global(.card) > :global(.outline) { z-index: 4; }

  .session-content {
    position: relative;
    z-index: 2;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .session-list-frame {
    position: relative;
    flex: 0 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .session-list {
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: none;
  }

  .session-list::-webkit-scrollbar {
    display: none;
  }

  .session-rows > :global(* + *) {
    box-shadow: inset 0 1px 0 var(--rule-shade), inset 0 2px 0 var(--rule-light);
  }

  .session-rows > :global(:only-child) {
    box-shadow: inset 0 -1px 0 var(--rule-shade), inset 0 -2px 0 var(--rule-light);
  }

  .scroll-fade {
    position: absolute;
    right: 0;
    left: 0;
    height: var(--sp-8);
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--duration-quick) var(--ease-smooth-out);
  }

  .scroll-fade[data-visible="true"] { opacity: 1; }
  .scroll-fade.top { top: 0; background: linear-gradient(to bottom, var(--card-inner), transparent); }
  .scroll-fade.bottom { bottom: 0; background: linear-gradient(to top, var(--card-inner), transparent); }

  .session-footer {
    flex: none;
    margin-top: auto;
    padding: var(--sp-4);
  }

  .session-well {
    border-radius: var(--radius-sm);
    background: var(--bg);
  }

  header {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    margin-bottom: var(--sp-2);
  }

  h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.75rem;
    letter-spacing: var(--tracking-heading);
  }

  header p {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: var(--ink-dim);
  }

  .quiet {
    margin: 0;
    font-size: 0.875rem;
    color: var(--ink-dim);
  }

  .you-badge {
    padding: var(--sp-1) var(--sp-2);
    color: var(--ink);
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1rem;
    border-radius: var(--radius-sm);
    background: var(--bg);
    box-shadow: var(--shadow-inset);
  }

  .remove-session {
    position: relative;
    isolation: isolate;
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    color: var(--ink-dim);
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: var(--radius-sm);
    transition: color var(--duration-quick) var(--ease-smooth-out);
  }

  .remove-session::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background: var(--hover-fill);
    box-shadow: inset 0 0 0 0.5px var(--hover-edge);
    opacity: 0;
    transform: scaleY(0.4);
    transform-origin: bottom;
    transition: opacity var(--duration-quick) var(--ease-smooth-out), transform var(--duration-quick) var(--ease-smooth-out);
  }

  .remove-session:hover:enabled::before,
  .remove-session:focus-visible::before {
    opacity: 1;
    transform: none;
    transition: opacity var(--duration-quick) var(--ease-smooth-out), transform var(--duration-fast) var(--ease-smooth-out);
  }

  .remove-session:hover:enabled,
  .remove-session:focus-visible {
    color: var(--ink);
  }

  .remove-session:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 1px;
  }

  .remove-session:disabled { cursor: default; }

  .portrait {
    display: grid;
    flex: none;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    overflow: hidden;
    border-radius: 6px;
    background: var(--hover-fill);
  }

  .portrait img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .glyph {
    width: 1.125rem;
    height: 1.125rem;
    background-color: oklch(0.88 0.045 82);
    mask: var(--icon) center / contain no-repeat;
  }

  .segments-card { display: flex; }

  .segments {
    position: relative;
    z-index: 2;
    display: inline-flex;
    padding: 2px;
    border-radius: var(--radius-sm);
  }

  .segments button {
    min-width: 4.5rem;
    padding: var(--sp-1) var(--sp-3);
    font: inherit;
    font-size: 0.8125rem;
    line-height: 1.25rem;
    color: var(--ink-dim);
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: calc(var(--radius-md) - 8px);
    transition:
      color var(--duration-quick) var(--ease-smooth-out),
      background-color var(--duration-quick) var(--ease-smooth-out);
  }

  .segments button[aria-checked="true"] {
    --sand-top: oklch(0.92 0.035 88);
    --sand-bottom: oklch(0.82 0.05 78);
    color: oklch(0.27 0.025 70);
    background:
      radial-gradient(ellipse 70% 110% at 50% 115%, oklch(0.42 0.1 55 / 0.45), oklch(0.42 0.1 55 / 0) 70%),
      linear-gradient(var(--sand-top), color-mix(in oklch, var(--sand-top), var(--sand-bottom)), var(--sand-bottom));
    box-shadow: inset 0 1px 0 color-mix(in oklch, var(--sand-top), oklch(1 0 0) 30%), var(--shadow-press);
  }

  .segments button:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 1px;
  }

  .method-icon { display: block; flex: none; color: var(--ink-dim); }
  .provider-icon { width: 20px; height: 20px; background: var(--ink-dim); mask: var(--icon) center / contain no-repeat; }
  .method-action { display: flex; }
  .method-action :global(.button), .method-action .link-button { position: relative; z-index: 2; background: transparent; box-shadow: none; }
  .method-action :global(.button:hover:enabled), .method-action .link-button:hover { background: var(--hover-fill); }

  .link-button {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    min-height: 2.25rem;
    padding: var(--sp-1) var(--sp-3);
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25rem;
    color: var(--ink);
    text-decoration: none;
    border-radius: calc(var(--radius-md) - 6px);
    background: var(--hover-fill);
    box-shadow: inset 0 0 0 0.5px var(--hover-edge);
  }

  .link-button:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  .confirm,
  .steps,
  .recovery {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }

  .confirm p,
  .steps p,
  .recovery p {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: var(--ink-dim);
  }

  .enroll {
    display: flex;
    gap: var(--sp-6);
    align-items: flex-start;
  }

  details {
    font-size: 0.8125rem;
    color: var(--ink-dim);
  }

  summary {
    cursor: pointer;
  }

  .secret {
    display: block;
    margin-top: var(--sp-2);
    font-size: 0.75rem;
    word-break: break-all;
    color: var(--ink);
  }

  .recovery ul {
    display: grid;
    grid-template-columns: repeat(2, max-content);
    gap: var(--sp-1) var(--sp-6);
    margin: 0;
    padding: var(--sp-3) var(--sp-4);
    list-style: none;
    border-radius: calc(var(--radius-md) - 6px);
    background: oklch(from var(--ink) l c h / 0.04);
  }

  .recovery code {
    font-size: 0.8125rem;
    color: var(--ink);
  }

  .buttons {
    display: flex;
    gap: var(--sp-2);
  }

  .notice {
    margin: 0;
    padding: var(--sp-3) var(--sp-4);
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: var(--ink);
  }

  .notice[data-tone="Failed"] {
    color: var(--err);
  }

  @media (prefers-reduced-motion: reduce) {
    .scroll-fade, .remove-session, .remove-session::before { transition: none; }
    .segments button {
      transition: none;
    }
  }
</style>
