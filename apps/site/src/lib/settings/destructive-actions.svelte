<script lang="ts" effect>
  import { Dialog, DropdownMenu } from "bits-ui";
  import { Effect } from "effect";
  import { CoreApi } from "@artisanstreet/core-client";
  import { disable_account } from "../account/session.ts";
  import type { Snapshot } from "./model.ts";
  import { request_deletion } from "./actions.ts";
  import CodeField from "./code-field.svelte";
  import Card from "../card/card.svelte";
  import wordmark from "../assets/wordmark.svg?url";
  import Button from "./button.svelte";
  import { friendly_error } from "./messages.ts";

  let { snapshot }: { snapshot: Snapshot } = $props();
  const api = yield* CoreApi;
  let deletion = $state<Snapshot["deletion"] | null>(null);
  let mode = $state<"disable" | "delete">("disable");
  let code = $state("");
  let open = $state(false);
  let waiting = $state(true);
  let busy = $state(false);
  let error = $state("");

  $effect(() => {
    if (!open) return;
    waiting = true;
    error = "";
    code = "";
    const timer = window.setTimeout(() => { waiting = false; }, 1500);
    return () => window.clearTimeout(timer);
  });

  const open_delete = Effect.gen(function* () {
    mode = "delete";
    open = true;
    busy = true;
    deletion = yield* api.deletion_status;
  }).pipe(
    Effect.catch((failure) => Effect.sync(() => { error = friendly_error(failure); })),
    Effect.ensuring(Effect.sync(() => { busy = false; })),
  );

  const confirm_delete = Effect.gen(function* () {
    if (waiting || busy) return;
    busy = true;
    error = "";
    yield* request_deletion(code);
    deletion = yield* api.deletion_status;
  }).pipe(
    Effect.catch((failure) => Effect.sync(() => { error = friendly_error(failure); })),
    Effect.ensuring(Effect.sync(() => { busy = false; })),
  );

  const confirm_disable = Effect.gen(function* () {
    if (waiting || busy) return;
    busy = true;
    error = "";
    yield* disable_account;
  }).pipe(
    Effect.catch((failure) => Effect.sync(() => { error = friendly_error(failure); })),
    Effect.ensuring(Effect.sync(() => { busy = false; })),
  );
</script>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger class="delete">
            Destructive actions
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content side="top" align="start" sideOffset={8}>
              {#snippet child({ wrapperProps, props })}
                <div {...wrapperProps} class="action-wrapper">
                  <div {...props} class="action-menu">
                    <DropdownMenu.Item class="action-item" onSelect={() => { mode = "disable"; open = true; }}><svg class="action-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></svg>Disable account</DropdownMenu.Item>
                    <DropdownMenu.Item class="action-item" onSelect={yield* open_delete}><svg class="action-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg>Delete account</DropdownMenu.Item>
                  </div>
                </div>
              {/snippet}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="disable-overlay" />
    <Dialog.Content class="disable-dialog">
      <Card radius="var(--radius-lg)">
        <div class="disable-shell">
          <div class="disable-heading"><span class="disable-wordmark" role="img" aria-label="Artisan" style:--wordmark={`url("${wordmark}")`}></span></div>
          <div class="disable-inner">
            <div class="disable-copy">
              <Dialog.Title class="disable-title">{mode === "disable" ? "Disable account?" : deletion?.status === "pending" ? "Deletion scheduled" : "Delete account?"}</Dialog.Title>
              <Dialog.Description class="disable-description">{mode === "disable" ? "You’ll be signed out on all devices. Sign in again whenever you want to reactivate your account." : deletion?.status === "pending" ? "Your account is scheduled for deletion. Sign out and sign in again within 30 days to cancel it." : "Your account will be scheduled for deletion after 30 days. You can cancel at any time during those 30 days by signing in again."}</Dialog.Description>
            </div>
            {#if mode === "delete" && deletion?.status !== "pending" && snapshot.me.totp_enrolled}
              <CodeField id="delete-account-code" label="Authenticator code" bind:value={code} readonly={busy} />
            {/if}
            {#if error}<p class="disable-error" role="alert">{error}</p>{/if}
            <div class="disable-buttons">
              <Button tone="secondary" disabled={busy} onclick={() => { open = false; }}>Close</Button>
              {#if mode === "disable"}
                <Button tone="solid-danger" disabled={busy || waiting} onclick={yield* confirm_disable}>Disable account</Button>
              {:else if deletion?.status !== "pending"}
                <Button tone="solid-danger" disabled={busy || waiting || !deletion || (snapshot.me.totp_enrolled && !code.trim())} onclick={yield* confirm_delete}>Delete account</Button>
              {/if}
            </div>
          </div>
        </div>
      </Card>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  :global(.disable-overlay) { position: fixed; inset: 0; z-index: 100; background: oklch(0 0 0 / 0.65); backdrop-filter: blur(6px); }
  :global(.disable-dialog) { position: fixed; z-index: 101; top: 50%; left: 50%; width: min(26rem, calc(100vw - 2rem)); transform: translate(-50%, -50%); outline: none; animation: disable-open var(--duration-fast) var(--ease-smooth-out); }
  @keyframes disable-open { from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); } }
  .disable-shell { position: relative; z-index: 2; padding: var(--sp-2); }
  .disable-heading { padding: var(--sp-6) var(--sp-4); }
  .disable-wordmark { display: block; height: 4.5rem; aspect-ratio: 311 / 512; background: var(--ink); mask: var(--wordmark) center / contain no-repeat; }
  .disable-copy { display: flex; flex-direction: column; gap: var(--sp-1); }
  :global(.disable-title) { margin: 0; color: var(--ink); font-size: 1rem; font-weight: 600; line-height: 1.4; }
  :global(.disable-description) { margin: 0; color: var(--ink-dim); font-size: 0.875rem; line-height: 1.5; }
  .disable-inner { display: flex; flex-direction: column; gap: var(--sp-4); padding: var(--sp-4); border-radius: var(--radius-md); background: var(--card-inner); box-shadow: var(--shadow-rest); }
  .disable-error { margin: 0; color: var(--err); font-size: 0.8125rem; }
  .disable-buttons { display: flex; justify-content: flex-end; gap: var(--sp-2); }

  :global(.delete) {
    --red-top: oklch(0.74 0.10 22);
    --red-bottom: oklch(0.55 0.17 25);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    margin-top: auto;
    min-height: 2.25rem;
    padding: var(--sp-1) var(--sp-3);
    color: oklch(0.14 0.035 22);
    font-size: 0.875rem;
    font-weight: 500;
    font-family: inherit;
    line-height: 1.25rem;
    text-decoration: none;
    border: 1px solid transparent;
    border-radius: calc(var(--radius-md) - 6px);
    cursor: pointer;
    background:
      radial-gradient(ellipse 70% 110% at 50% 115%, oklch(0.38 0.1 22 / 0.45), oklch(0.38 0.1 22 / 0) 70%) padding-box,
      linear-gradient(var(--red-top), color-mix(in oklch, var(--red-top), var(--red-bottom)), var(--red-bottom)) padding-box,
      linear-gradient(color-mix(in oklch, var(--red-top), oklch(0 0 0) 8%), color-mix(in oklch, var(--red-bottom), oklch(0 0 0) 25%)) border-box;
    box-shadow: inset 0 1px 0 color-mix(in oklch, var(--red-top), oklch(1 0 0) 25%), var(--shadow-press);
    transition: transform var(--duration-quick) var(--ease-smooth-out), box-shadow var(--duration-quick) var(--ease-smooth-out);
  }

  :global(.delete:focus-visible) { outline: 2px solid var(--focus); outline-offset: 1px; }

  :global(.delete:hover) {
    --red-top: color-mix(in oklch, oklch(0.74 0.10 22), oklch(1 0 0) 6%);
  }

  :global(.delete:active) {
    --red-top: color-mix(in oklch, oklch(0.74 0.10 22), oklch(0 0 0) 4%);
    --red-bottom: color-mix(in oklch, oklch(0.55 0.17 25), oklch(0 0 0) 5%);
    transform: translateY(1px);
    box-shadow: 0 0 0.5px oklch(0 0 0 / 0.3);
  }

  .action-wrapper { z-index: 60; }

  .action-menu {
    position: relative;
    z-index: 60;
    display: flex;
    flex-direction: column;
    width: var(--bits-floating-anchor-width);
    padding: 6px;
    color: var(--ink);
    border-radius: var(--radius-md);
    background: linear-gradient(180deg, oklch(1 0 0 / 0.08), oklch(1 0 0 / 0) 44%), linear-gradient(145deg, oklch(from var(--glass-near) l c h / 0.22), oklch(from var(--glass-far) l c h / 0.16)), oklch(from var(--ink) l c h / 0.05);
    backdrop-filter: blur(20px);
    box-shadow: 0 -1px 0 oklch(1 0 0 / 0.14), inset 0 1px 0 oklch(1 0 0 / 0.1), inset 0 -1px 0 var(--glass-rim-shade), var(--shadow-overlay);
    transform-origin: var(--bits-floating-transform-origin);
    will-change: transform, opacity;
  }

  .action-menu[data-state="open"] { animation: menu-open var(--dropdown-open-dur) var(--dropdown-ease); }
  .action-menu[data-state="closed"] { animation: menu-close var(--dropdown-close-dur) var(--dropdown-ease) forwards; }
  @keyframes menu-open { from { opacity: 0; transform: scale(var(--dropdown-pre-scale)); } }
  @keyframes menu-close { to { opacity: 0; transform: scale(var(--dropdown-closing-scale)); } }

  :global(.action-item) {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    color: var(--ink);
    font-size: 0.875rem;
    line-height: 1.25rem;
    text-decoration: none;
    border-radius: calc(var(--radius-md) - 6px);
    cursor: pointer;
    outline: none;
  }

  .action-icon { flex: none; color: var(--ink-dim); }

  :global(.action-item[data-highlighted]), :global(.action-item[data-state="open"]) { background: var(--hover-fill); }
  :global(.action-item[data-disabled]) { color: var(--ink-dim); cursor: default; }

  @media (prefers-reduced-motion: reduce) {
    .action-menu[data-state], :global(.disable-dialog) { animation: none; }
    :global(.delete) { transition: none; }
  }
</style>
