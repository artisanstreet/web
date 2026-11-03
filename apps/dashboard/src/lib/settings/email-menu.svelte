<script lang="ts">
  import { DropdownMenu } from "bits-ui";

  let { email }: { email: string } = $props();
  let open = $state(false);

  $effect(() => {
    if (!open) return;
    const close_on_scroll = (event: Event) => {
      if (event.target instanceof Element && event.target.classList.contains("profile-scroll")) open = false;
    };
    document.addEventListener("scroll", close_on_scroll, true);
    return () => document.removeEventListener("scroll", close_on_scroll, true);
  });
</script>

<DropdownMenu.Root bind:open>
  <DropdownMenu.Trigger class="email-menu-trigger" aria-label={`Actions for ${email}`}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <DropdownMenu.Content side="bottom" align="end" sideOffset={4}>
      {#snippet child({ wrapperProps, props })}
        <div {...wrapperProps} class="email-menu-wrapper">
          <div {...props} class="email-menu">
            <DropdownMenu.Item class="email-menu-item" disabled>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg>
              Remove
            </DropdownMenu.Item>
            <DropdownMenu.Item class="email-menu-item" disabled>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z"/><path d="m9 12 2 2 4-4"/></svg>
              Verify
            </DropdownMenu.Item>
            <p class="email-menu-note">Email management is not available yet.</p>
          </div>
        </div>
      {/snippet}
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>

<style>
  :global(.email-menu-trigger) { display: grid; flex: none; place-items: center; width: 2rem; height: 2rem; padding: 0; color: var(--ink-dim); border: 0; border-radius: calc(var(--radius-md) - 6px); background: transparent; cursor: pointer; }
  :global(.email-menu-trigger:hover), :global(.email-menu-trigger[data-state="open"]) { color: var(--ink); background: var(--hover-fill); }
  :global(.email-menu-trigger:focus-visible) { outline: 2px solid var(--focus); outline-offset: 1px; }
  .email-menu-wrapper { z-index: 60; }
  .email-menu { position: relative; z-index: 60; display: flex; flex-direction: column; width: 13rem; padding: 6px; color: var(--ink); border-radius: var(--radius-md); background: linear-gradient(180deg, oklch(1 0 0 / 0.08), oklch(1 0 0 / 0) 44%), linear-gradient(145deg, oklch(from var(--glass-near) l c h / 0.22), oklch(from var(--glass-far) l c h / 0.16)), oklch(from var(--ink) l c h / 0.05); backdrop-filter: blur(20px); box-shadow: 0 -1px 0 oklch(1 0 0 / 0.14), inset 0 1px 0 oklch(1 0 0 / 0.1), inset 0 -1px 0 var(--glass-rim-shade), var(--shadow-overlay); transform-origin: var(--bits-floating-transform-origin); }
  .email-menu[data-state="open"] { animation: menu-open var(--dropdown-open-dur) var(--dropdown-ease); }
  .email-menu[data-state="closed"] { animation: menu-close var(--dropdown-close-dur) var(--dropdown-ease) forwards; }
  @keyframes menu-open { from { opacity: 0; transform: scale(var(--dropdown-pre-scale)); } }
  @keyframes menu-close { to { opacity: 0; transform: scale(var(--dropdown-closing-scale)); } }
  :global(.email-menu-item) { display: flex; align-items: center; gap: var(--sp-2); padding: var(--sp-2) var(--sp-3); color: var(--ink-dim); font-size: 0.875rem; line-height: 1.25rem; border-radius: calc(var(--radius-md) - 6px); }
  :global(.email-menu-item svg) { flex: none; color: var(--ink-dim); }
  .email-menu-note { margin: var(--sp-1) var(--sp-3) var(--sp-2); color: var(--ink-dim); font-size: 0.75rem; line-height: 1.35; }
  @media (prefers-reduced-motion: reduce) { .email-menu[data-state] { animation: none; } }
</style>
