<script lang="ts" effect>
  import { Dialog } from "bits-ui";
  import { Option } from "effect";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import Outline from "../card/outline.svelte";
  import Panel from "./panel.svelte";
  import { groups, Pane, pane_of, url_with, type PaneInfo } from "./pane.ts";

  const open_pane = $derived(pane_of(page.url));
  const closed_url = $derived(url_with(page.url, Option.none()));

  let shown: Pane = $state(Pane.Profile());
  $effect.pre(() => {
    if (Option.isSome(open_pane)) shown = open_pane.value;
  });

  const close = (open: boolean) => {
    if (!open) goto(closed_url, { reset: false });
  };
</script>

{#snippet entry(info: PaneInfo, current: Pane)}
  <a
    class="entry"
    href={url_with(page.url, Option.some(info.pane))}
    aria-current={info.pane._tag === current._tag ? "page" : undefined}
    data-sveltekit-replacestate
    data-sveltekit-reset="false"
  >
    {info.label}
  </a>
{/snippet}

<Dialog.Root open={Option.isSome(open_pane)} onOpenChange={close}>
  <Dialog.Portal>
    <Dialog.Overlay class="settings-overlay" />
    <Dialog.Content class="settings-dialog">
        <Dialog.Title class="settings-title">Settings</Dialog.Title>
        <div class="sidebar">
        <nav aria-label="Settings">
          <Outline />
          {#each groups as group (group.label)}
            <div class="group">
              <span class="group-label">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  {#if group.label === "Account"}
                    <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
                    <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
                  {:else if group.label === "Security"}
                    <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" />
                    <path d="m9 12 2 2 4-4" />
                  {:else}
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M9 4v16M9 10h12" />
                  {/if}
                </svg>
                {group.label}
              </span>
              <div class="group-items">
                {#each group.panes as info (info.slug)}
                  {@render entry(info, shown)}
                {/each}
              </div>
            </div>
          {/each}
        </nav>
        </div>
        <div class="body">
          <Panel pane={shown} />
        </div>
        <a class="close" href={closed_url} aria-label="Close settings" data-sveltekit-reset="false">
          <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
            <path d="M3 3l6 6M9 3 3 9" />
          </svg>
        </a>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  :global(.settings-overlay) {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: oklch(0 0 0 / 0.55);
    backdrop-filter: blur(6px);
  }

  :global(.settings-overlay[data-state="open"]) {
    animation: overlay-in var(--dropdown-open-dur) var(--dropdown-ease);
  }

  :global(.settings-overlay[data-state="closed"]) {
    animation: overlay-out var(--dropdown-close-dur) var(--dropdown-ease) forwards;
  }

  :global(.settings-dialog) {
    position: fixed;
    top: 50%;
    left: 50%;
    z-index: 51;
    display: grid;
    grid-template-columns: 15rem minmax(0, 1fr);
    width: min(68rem, calc(100vw - 2 * var(--sp-6)));
    height: min(42rem, calc(100dvh - 2 * var(--sp-6)));
    overflow: hidden;
    color: var(--ink);
    border-radius: calc(var(--radius-md) + var(--sp-2));
    background: var(--bg);
    box-shadow:
      inset 0 1px 0 oklch(1 0 0 / 0.08),
      inset 0 -1px 0 var(--glass-rim-shade),
      var(--shadow-overlay);
    outline: none;
    transform: translate(-50%, -50%);
  }

  :global(.settings-dialog[data-state="open"]) {
    animation: dialog-in var(--dropdown-open-dur) var(--dropdown-ease);
  }

  :global(.settings-dialog[data-state="closed"]) {
    animation: dialog-out var(--dropdown-close-dur) var(--dropdown-ease) forwards;
  }

  @keyframes overlay-in {
    from {
      opacity: 0;
    }
  }

  @keyframes overlay-out {
    to {
      opacity: 0;
    }
  }

  @keyframes dialog-in {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(var(--dropdown-pre-scale));
    }
  }

  @keyframes dialog-out {
    to {
      opacity: 0;
      transform: translate(-50%, -50%) scale(var(--dropdown-closing-scale));
    }
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    min-height: 0;
    margin: var(--sp-8) 0 var(--sp-8) var(--sp-8);
  }

  nav {
    --card-surface: var(--card-inner);
    --card-radius: var(--radius-md);
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: var(--sp-4);
    min-height: 0;
    padding: var(--sp-6) var(--sp-3) var(--sp-3);
    overflow-y: auto;
    border-radius: var(--card-radius);
    background: var(--card-surface);
    box-shadow: var(--shadow-rest);
  }

  :global(.settings-title) {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .group-label {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: 0 var(--sp-3) var(--sp-1);
    font-size: 0.75rem;
    line-height: 1rem;
    color: var(--ink);
  }

  .group-label svg {
    flex: none;
    color: var(--ink-dim);
  }

  .group-items {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-left: calc(var(--sp-3) + 8px - 0.5px);
    padding-left: var(--sp-2);
    border-left: 1px solid color-mix(in oklch, var(--card-surface), var(--ink) 45%);
  }

  .entry {
    position: relative;
    isolation: isolate;
    padding: var(--sp-1) var(--sp-3);
    font-size: 0.875rem;
    line-height: 1.5rem;
    color: var(--ink-dim);
    text-decoration: none;
    border-radius: calc(var(--radius-md) - 6px);
    outline: none;
    transition: color var(--duration-quick) var(--ease-smooth-out);
  }

  .entry::before {
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
    transition:
      opacity var(--duration-quick) var(--ease-smooth-out),
      transform var(--duration-quick) var(--ease-smooth-out);
  }

  .entry:hover {
    color: var(--ink);
  }

  .entry:hover::before,
  .entry:focus-visible::before {
    opacity: 1;
    transform: none;
    transition:
      opacity var(--duration-quick) var(--ease-smooth-out),
      transform var(--duration-fast) var(--ease-smooth-out);
  }

  .entry[aria-current="page"] {
    color: var(--ink);
  }


  .body {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: var(--sp-8);
    overflow-y: auto;
  }

  .body:has(:global(.pane[data-sessions])),
  .body:has(:global(.pane[data-profile])) {
    overflow: hidden;
  }

  .close {
    position: absolute;
    top: var(--sp-4);
    right: var(--sp-4);
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    color: var(--ink-dim);
    border-radius: calc(var(--radius-md) - 6px);
    transition: color var(--duration-quick) var(--ease-smooth-out);
  }

  .close:hover {
    color: var(--ink);
    background: var(--hover-fill);
  }

  .close:focus-visible,
  .entry:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 1px;
  }

  @media (max-width: 40rem) {
    :global(.settings-dialog) {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto minmax(0, 1fr);
    }

    .sidebar {
      margin: var(--sp-8);
    }

    nav {
      flex-direction: row;
      flex-wrap: wrap;
      padding: var(--sp-4);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.settings-overlay[data-state]),
    :global(.settings-dialog[data-state]) {
      animation: none;
    }


    .entry,
    .entry::before,
    .close {
      transition: none;
    }
  }
</style>
