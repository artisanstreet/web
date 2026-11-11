<script lang="ts" effect>
  import { DropdownMenu } from "bits-ui";
  import { Option } from "effect";
  import Card from "../card/card.svelte";
  import Wordmark from "../wordmark/wordmark.svelte";
  import { sidebar_state } from "./state.svelte.ts";
  import { Session, upgrade_target, type Account } from "../account/account.ts";
  import { add_account_url, sign_out, switch_to } from "../account/session.ts";
  import fallback_glyph from "../assets/user.svg?url";
  import settings_glyph from "../assets/settings.svg?url";
  import add_glyph from "../assets/user-plus.svg?url";
  import check_glyph from "../assets/check.svg?url";
  import { theme_state } from "../theme/state.svelte.ts";
  import ThemeIcon from "../theme/theme-icon.svelte";
  import help_glyph from "../assets/message-circle-question.svg?url";
  import sign_out_glyph from "../assets/logout.svg?url";
  import upgrade_glyph from "../assets/circle-arrow-up.svg?url";

  let { session }: { session: Session } = $props();

  const entries = [
    { label: "Settings", icon: settings_glyph, href: Option.some("?settings=profile") },
    { label: "Help & Feedback", icon: help_glyph, href: Option.none<string>() },
  ];
  const surface = "var(--card-inner)";
</script>

{#snippet avatar(picture: Option.Option<string>)}
  {#if Option.isSome(picture)}
    <img src={picture.value} alt="" width="96" height="96" referrerpolicy="no-referrer" />
  {:else}
    <span class="glyph" style:--icon={`url("${fallback_glyph}")`}></span>
  {/if}
{/snippet}

{#snippet identity(account: Account)}
  <span class="badge" aria-hidden="true">{@render avatar(account.avatar)}</span>
  <span class="identity">
    <span class="identity-name">{account.name}</span>
    <span class="identity-email">{account.email}</span>
  </span>
{/snippet}

<aside id="sidebar" data-open={sidebar_state.open}>
  <div class="sheet">
  <div class="frame">
    <Card radius="var(--outer-radius)">
      <div class="stack">
        <header>
          <Wordmark
            label={sidebar_state.open ? "Hide sidebar" : "Show sidebar"}
            expanded={sidebar_state.open}
            onclick={sidebar_state.toggle}
          />
        </header>
        <div class="inner">
          <Card surface={surface} radius="var(--inner-radius)" />
          <div class="footer">
            <Card surface={surface} radius="var(--inner-radius)">
              {#if Session.$is("SignedIn")(session)}
              {@const account = session.account}
              {@const accounts = session.accounts}
              {@const upgrade = upgrade_target(account.plan)}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  {#snippet child({ props })}
                    <button {...props} type="button" class="trigger">
                      <span class="fill" aria-hidden="true">{@render avatar(account.avatar)}</span>
                      <span class="name">{account.name}</span>
                      <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M3 7.5 6 4.5l3 3" />
                      </svg>
                    </button>
                  {/snippet}
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content side="top" align="start" sideOffset={8}>
                    {#snippet child({ wrapperProps, props })}
                      <div {...wrapperProps}>
                        <div {...props} class="menu">
                          <DropdownMenu.Sub>
                            <DropdownMenu.SubTrigger>
                              {#snippet child({ props: item })}
                                <div {...item} class="header">
                                  {@render identity(account)}
                                  <svg class="chevron" viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <path d="M4.5 3 7.5 6l-3 3" />
                                  </svg>
                                </div>
                              {/snippet}
                            </DropdownMenu.SubTrigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.SubContent sideOffset={14} align="start" alignOffset={-6}>
                                {#snippet child({ wrapperProps, props: sub })}
                                  <div {...wrapperProps}>
                                    <div {...sub} class="menu submenu">
                                      {#each accounts as other (other.id)}
                                        {#if other.id === account.id}
                                          <DropdownMenu.Item>
                                            {#snippet child({ props: item })}
                                              <div {...item} class="header" aria-current="true">
                                                {@render identity(other)}
                                                <span class="glyph check" style:--icon={`url("${check_glyph}")`}></span>
                                              </div>
                                            {/snippet}
                                          </DropdownMenu.Item>
                                        {:else}
                                          <DropdownMenu.Item onSelect={yield* switch_to(other.id)}>
                                            {#snippet child({ props: item })}
                                              <div {...item} class="header">
                                                {@render identity(other)}
                                              </div>
                                            {/snippet}
                                          </DropdownMenu.Item>
                                        {/if}
                                      {/each}
                                      <DropdownMenu.Separator class="rule" />
                                      <DropdownMenu.Item>
                                        {#snippet child({ props: item })}
                                          <a {...item} class="item" href={add_account_url()}>
                                            <span class="glyph" style:--icon={`url("${add_glyph}")`}></span>
                                            Add account
                                          </a>
                                        {/snippet}
                                      </DropdownMenu.Item>
                                    </div>
                                  </div>
                                {/snippet}
                              </DropdownMenu.SubContent>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Sub>
                          <DropdownMenu.Separator class="rule" />
                          <DropdownMenu.Item
                            onSelect={(event) => {
                              event.preventDefault();
                              theme_state.flip();
                            }}
                          >
                            {#snippet child({ props: item })}
                              <div {...item} class="item">
                                Theme
                                <ThemeIcon />
                              </div>
                            {/snippet}
                          </DropdownMenu.Item>
                          {#each entries as entry (entry.label)}
                            <DropdownMenu.Item>
                              {#snippet child({ props: item })}
                                {#if Option.isSome(entry.href)}
                                  <a {...item} class="item" href={entry.href.value}>
                                    {entry.label}
                                    <span class="glyph trailing" style:--icon={`url("${entry.icon}")`}></span>
                                  </a>
                                {:else}
                                  <div {...item} class="item">
                                    {entry.label}
                                    <span class="glyph trailing" style:--icon={`url("${entry.icon}")`}></span>
                                  </div>
                                {/if}
                              {/snippet}
                            </DropdownMenu.Item>
                          {/each}
                          {#if Option.isSome(upgrade)}
                            <DropdownMenu.Item>
                              {#snippet child({ props: item })}
                                <div {...item} class="upgrade">
                                  <span class="glyph" style:--icon={`url("${upgrade_glyph}")`}></span>
                                  Upgrade to {upgrade.value._tag}
                                </div>
                              {/snippet}
                            </DropdownMenu.Item>
                          {/if}
                          <DropdownMenu.Separator class="rule" />
                          <DropdownMenu.Item onSelect={yield* sign_out}>
                            {#snippet child({ props: item })}
                              <div {...item} class="item">
                                Sign out
                                <span class="glyph trailing" style:--icon={`url("${sign_out_glyph}")`}></span>
                              </div>
                            {/snippet}
                          </DropdownMenu.Item>
                        </div>
                      </div>
                    {/snippet}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
              {:else}
                <button type="button" class="trigger" disabled>
                  <span class="fill" aria-hidden="true">{@render avatar(Option.none())}</span>
                  <span class="name">{Session.$is("Unreachable")(session) ? "Account unavailable" : ""}</span>
                </button>
              {/if}
            </Card>
          </div>
        </div>
      </div>
    </Card>
  </div>
  </div>
</aside>

<style>
  aside {
    position: sticky;
    top: 0;
    flex: none;
    width: var(--sidebar-width);
    height: 100dvh;
    overflow: clip;
    contain: layout style;
    transition: width var(--resize-dur) var(--resize-ease);
    will-change: width;
  }

  aside[data-open="false"] {
    width: 7.25rem;
  }

  .sheet {
    display: flex;
    width: 100%;
    height: 100%;
    padding: var(--sp-3);
  }

  .frame {
    --inset: var(--sp-2);
    --outer-radius: calc(var(--radius-md) + var(--inset));
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  .stack {
    display: flex;
    flex: 1;
    flex-direction: column;
  }

  header {
    display: flex;
    align-items: flex-start;
    padding: var(--sp-6);
  }

  .inner {
    display: flex;
    flex: 1;
    flex-direction: column;
    --inner-radius: var(--radius-md);
    gap: var(--inset);
    margin: 0 var(--inset) var(--inset);
  }

  .footer {
    display: flex;
    flex: none;
    height: 3rem;
    transition: height var(--resize-dur) var(--resize-ease);
  }

  aside[data-open="false"] .footer {
    height: 4.75rem;
  }

  .footer > :global(.card) {
    overflow: hidden;
  }

  .trigger {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 1;
    width: 100%;
    padding: var(--sp-1) var(--sp-3) var(--sp-1) 3.5rem;
    font: inherit;
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: var(--ink);
    cursor: pointer;
    background: none;
    border: 0;
    outline: none;
  }

  .trigger:disabled {
    cursor: default;
  }

  .fill {
    position: absolute;
    top: var(--sp-1);
    bottom: var(--sp-1);
    left: var(--sp-1);
    display: grid;
    place-items: center;
    aspect-ratio: 1;
    overflow: hidden;
    pointer-events: none;
    border-radius: calc(var(--inner-radius) - var(--sp-1));
  }

  .fill img,
  .badge img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .fill::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow:
      inset 0 1px 0 oklch(1 0 0 / 0.32),
      inset 1px 0 0 oklch(1 0 0 / 0.14),
      inset -1px 0 0 oklch(1 0 0 / 0.14),
      inset 0 -1px 0 oklch(0 0 0 / 0.45),
      inset 0 2px 0 oklch(1 0 0 / 0.1),
      inset 2px 0 0 oklch(1 0 0 / 0.06),
      inset -2px 0 0 oklch(1 0 0 / 0.06),
      inset 0 -2px 0 oklch(0 0 0 / 0.2);
  }

  .glyph {
    width: 1.125rem;
    height: 1.125rem;
    background-color: oklch(0.88 0.045 82);
    mask: var(--icon) center / contain no-repeat;
  }

  .name {
    overflow: hidden;
    white-space: nowrap;
    opacity: 1;
    transition: opacity var(--duration-fast) var(--text-swap-ease);
  }

  aside[data-open="false"] .name {
    opacity: 0;
  }

  .trigger svg {
    flex: none;
    opacity: 1;
    color: var(--ink-dim);
    transition:
      transform var(--duration-fast) var(--ease-smooth-out),
      opacity var(--duration-fast) var(--text-swap-ease);
  }

  aside[data-open="false"] .trigger svg {
    opacity: 0;
  }

  .trigger[data-state="open"] svg {
    transform: rotate(180deg);
  }

  .menu {
    position: relative;
    display: flex;
    flex-direction: column;
    width: calc(var(--sidebar-width) - 2 * var(--sp-3) - 2 * var(--sp-2));
    padding: 6px;
    overflow: hidden;
    color: var(--ink);
    border-radius: var(--radius-md);
    background:
      linear-gradient(180deg, oklch(1 0 0 / 0.08), oklch(1 0 0 / 0) 44%),
      linear-gradient(145deg, oklch(from var(--glass-near) l c h / 0.22), oklch(from var(--glass-far) l c h / 0.16)),
      oklch(from var(--ink) l c h / 0.05);
    backdrop-filter: blur(20px);
    transform-origin: var(--bits-floating-transform-origin);
    will-change: transform, opacity;
    box-shadow:
      0 -1px 0 oklch(1 0 0 / 0.14),
      inset 0 1px 0 oklch(1 0 0 / 0.1),
      inset 0 -1px 0 var(--glass-rim-shade),
      var(--shadow-overlay);
  }

  .menu[data-state="open"] {
    animation: menu-open var(--dropdown-open-dur) var(--dropdown-ease);
  }

  .menu[data-state="closed"] {
    animation: menu-close var(--dropdown-close-dur) var(--dropdown-ease) forwards;
  }

  @keyframes menu-open {
    from {
      opacity: 0;
      transform: scale(var(--dropdown-pre-scale));
    }
  }

  @keyframes menu-close {
    to {
      opacity: 0;
      transform: scale(var(--dropdown-closing-scale));
    }
  }

  .submenu {
    width: max-content;
    min-width: 16rem;
  }

  .header {
    position: relative;
    isolation: isolate;
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-2);
    cursor: pointer;
    outline: none;
    border-radius: calc(var(--radius-md) - 6px);
  }


  .badge {
    display: grid;
    flex: none;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    overflow: hidden;
    border-radius: 6px;
  }

  .chevron {
    flex: none;
    margin-left: auto;
    color: var(--ink-dim);
  }

  .check {
    margin-left: auto;
    background-color: var(--ink-dim);
  }

  .identity {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding-right: var(--sp-2);
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .identity-name {
    color: var(--ink);
  }

  .identity-email {
    color: var(--ink-dim);
  }

  .item {
    position: relative;
    text-decoration: none;
    isolation: isolate;
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: var(--ink);
    cursor: pointer;
    outline: none;
    border-radius: calc(var(--radius-md) - 6px);
  }

  .item .glyph {
    width: 1rem;
    height: 1rem;
    background-color: var(--ink-dim);
  }

  .trailing {
    margin-left: auto;
  }

  .header::before,
  .item::before {
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

  .header[data-highlighted]::before,
  .header[data-state="open"]::before,
  .item[data-highlighted]::before {
    opacity: 1;
    transform: none;
    transition:
      opacity var(--duration-quick) var(--ease-smooth-out),
      transform var(--duration-fast) var(--ease-smooth-out);
  }

  .upgrade {
    position: relative;
    --sand-light: oklch(0.92 0.035 88);
    --sand-deep: oklch(0.82 0.05 78);
    --sand-top: var(--sand-light);
    --sand-bottom: var(--sand-deep);
    --sand-ink: oklch(0.27 0.025 70);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    margin: var(--sp-2) 0 var(--sp-1);
    padding: var(--sp-2) var(--sp-3);
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25rem;
    color: var(--sand-ink);
    cursor: pointer;
    outline: none;
    border: 1px solid transparent;
    border-radius: calc(var(--radius-md) - 6px);
    background:
      radial-gradient(ellipse 70% 110% at 50% 115%, oklch(0.42 0.1 55 / 0.45), oklch(0.42 0.1 55 / 0) 70%) padding-box,
      linear-gradient(var(--sand-top), color-mix(in oklch, var(--sand-top), var(--sand-bottom)), var(--sand-bottom)) padding-box,
      linear-gradient(color-mix(in oklch, var(--sand-top), oklch(0 0 0) 8%), color-mix(in oklch, var(--sand-bottom), oklch(0 0 0) 25%)) border-box;
    box-shadow:
      inset 0 1px 0 color-mix(in oklch, var(--sand-top), oklch(1 0 0) 30%),
      var(--shadow-press);
    transform: translateY(0);
    transition:
      transform var(--duration-quick) var(--ease-smooth-out),
      box-shadow var(--duration-quick) var(--ease-smooth-out);
  }

  .upgrade .glyph {
    width: 1rem;
    height: 1rem;
    background-color: color-mix(in oklch, var(--sand-ink) 80%, transparent);
  }

  .upgrade[data-highlighted] {
    --sand-top: color-mix(in oklch, var(--sand-light), oklch(1 0 0) 6%);
  }

  .upgrade:active {
    --sand-top: color-mix(in oklch, var(--sand-light), oklch(0 0 0) 4%);
    --sand-bottom: color-mix(in oklch, var(--sand-deep), oklch(0 0 0) 5%);
    transform: translateY(1.5px);
    box-shadow:
      inset 0 1px 0 transparent,
      0 0 0.5px oklch(0 0 0 / 0.3);
    transition-duration: var(--duration-micro);
    transition-timing-function: ease-out;
  }

  .upgrade::after {
    content: "";
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    pointer-events: none;
    background: radial-gradient(ellipse 90% 120% at 50% -15%, oklch(0.25 0.04 65 / 0.4), oklch(0.25 0.04 65 / 0) 70%);
    box-shadow: inset 0 1px 0 oklch(0.25 0.04 65 / 0.45);
    opacity: 0;
    transition: opacity var(--duration-quick) var(--ease-smooth-out);
  }

  .upgrade:active::after {
    opacity: 1;
    transition-duration: var(--duration-micro);
  }

  .menu :global(.rule) {
    flex: none;
    height: 2px;
    margin: 4px -6px;
    background: linear-gradient(var(--rule-shade) 50%, var(--rule-light) 50%);
  }

  @media (prefers-reduced-motion: reduce) {
    aside,
    .footer,
    .name,
    .trigger svg {
      transition: none;
    }

    .menu[data-state] {
      animation: none;
    }

    .header::before,
    .item::before,
    .upgrade {
      transition: none;
    }
  }
</style>
