<script lang="ts">
  const id = $props.id();

  let { disabled = false, busy = false }: { disabled?: boolean; busy?: boolean } = $props();
</script>

<button class="continue" type="submit" {disabled} data-busy={busy} aria-busy={busy} aria-label="Continue">
  <svg class="surface" viewBox="0 0 53 45" aria-hidden="true" focusable="false">
    <defs>
      {#snippet sky_stops()}
        <stop offset="0" class="face-top" />
        <stop offset="0.06" class="face-indigo" />
        <stop offset="0.16" class="face-middle" />
        <stop offset="0.4" class="face-dusk" />
        <stop offset="0.72" class="face-control" />
        <stop offset="0.96" class="face-light" />
        <stop offset="1" class="face-bottom" />
      {/snippet}
      <clipPath id="{id}-clip">
        <path d="M0 0H45A8 8 0 0 1 53 8V37A8 8 0 0 1 45 45H0A8 8 0 0 0 8 37V8A8 8 0 0 0 0 0Z" />
      </clipPath>
      <linearGradient id="{id}-rim" class="rim" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="45">
        {@render sky_stops()}
      </linearGradient>
      <linearGradient id="{id}-highlight" class="highlight" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="45">
        {@render sky_stops()}
      </linearGradient>
      <radialGradient id="{id}-shade" gradientUnits="userSpaceOnUse" cx="26" cy="-2" r="34" gradientTransform="translate(26 -2) scale(1 0.8) translate(-26 2)">
        <stop offset="0" class="shade-top" />
        <stop offset="1" class="shade-bottom" />
      </radialGradient>
      <linearGradient id="{id}-face" class="face" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="45">
        {@render sky_stops()}
      </linearGradient>
    </defs>
    <path
      d="M0 0H45A8 8 0 0 1 53 8V37A8 8 0 0 1 45 45H0A8 8 0 0 0 8 37V8A8 8 0 0 0 0 0Z"
      fill="url(#{id}-rim)"
    />
    <g clip-path="url(#{id}-clip)">
      <path d="M0 1H45A7 7 0 0 1 52 8V37A7 7 0 0 1 45 44H0Z" fill="url(#{id}-highlight)" />
      <path d="M0 2H45A6 6 0 0 1 51 8V37A6 6 0 0 1 45 43H0Z" fill="url(#{id}-face)" />
      <path class="shade" d="M0 2H45A6 6 0 0 1 51 8V37A6 6 0 0 1 45 43H0Z" fill="url(#{id}-shade)" />
    </g>
  </svg>
  <span class="glyph" data-state={busy ? "b" : "a"}>
    <svg
      class="icon"
      data-icon="a"
      viewBox="0 0 30 30"
      fill="none"
      stroke="url(#{id}-arrow)"
      stroke-width="3"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="{id}-arrow" gradientUnits="userSpaceOnUse" x1="0" y1="-8" x2="0" y2="37">
          <stop offset="0" class="arrow-top" />
          <stop offset="1" class="arrow-bottom" />
        </linearGradient>
      </defs>
      <path d="M6.5 15.5H23.5M18.5 10.5l5 5-5 5" />
    </svg>
    <svg
      class="icon spinner"
      data-icon="b"
      viewBox="0 0 30 30"
      fill="none"
      stroke-width="3"
      stroke-linecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <g class="spin">
        <circle cx="15" cy="15" r="8.5" class="track" />
        <path d="M15 6.5a8.5 8.5 0 0 1 8.5 8.5" class="arc" />
      </g>
    </svg>
  </span>
</button>

<style>
  .continue {
    --continue-sand-light: var(--sky-night);
    --continue-sand-deep: var(--sky-horizon);
    --continue-ink: var(--sky-ink);
    --continue-face-top: var(--continue-sand-light);
    --continue-face-bottom: var(--continue-sand-deep);
    --continue-bevel: 0%;
    --continue-rim: 12%;
    position: relative;
    display: grid;
    place-items: center;
    width: var(--field-height);
    height: var(--field-height);
    padding: 0;
    border: 0;
    border-radius: var(--field-radius);
    background: none;
    cursor: pointer;
  }

  .continue:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .continue[data-busy="true"]:disabled {
    cursor: progress;
    opacity: 1;
  }

  .continue:focus-visible {
    outline: none;
  }

  .surface {
    position: absolute;
    top: 0;
    right: 0;
    width: calc(var(--field-height) * 53 / 45);
    height: 100%;
    pointer-events: none;
    transform: translateY(0);
    filter: drop-shadow(0 1px 2px oklch(0 0 0 / 0.12));
    transition:
      transform var(--duration-quick) var(--ease-smooth-out),
      filter var(--duration-quick) var(--ease-smooth-out);
  }

  .glyph {
    position: relative;
    display: inline-grid;
    width: calc(var(--field-height) * 2 / 3);
    height: calc(var(--field-height) * 2 / 3);
    transform: translateY(0);
    transition: transform var(--duration-quick) var(--ease-smooth-out);
  }

  .icon {
    grid-area: 1 / 1;
    width: 100%;
    height: 100%;
    transition:
      opacity var(--icon-swap-dur) var(--icon-swap-ease),
      filter var(--icon-swap-dur) var(--icon-swap-ease),
      transform var(--icon-swap-dur) var(--icon-swap-ease);
    will-change: opacity, filter, transform;
  }

  .glyph[data-state="a"] .icon[data-icon="a"],
  .glyph[data-state="b"] .icon[data-icon="b"] {
    opacity: 1;
    filter: blur(0);
    transform: scale(1);
  }

  .glyph[data-state="a"] .icon[data-icon="b"],
  .glyph[data-state="b"] .icon[data-icon="a"] {
    opacity: 0;
    filter: blur(var(--icon-swap-blur));
    transform: scale(var(--icon-swap-start-scale));
  }

  .spinner {
    stroke: var(--continue-ink);
  }

  .track {
    opacity: 0.18;
  }

  .spin {
    transform-origin: 15px 15px;
    animation: continue-spin 0.8s linear infinite;
  }

  @keyframes continue-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .icon {
      transition: none !important;
    }
  }

  .continue:active:enabled {
    --continue-face-top: color-mix(in oklch, var(--continue-sand-light), oklch(0 0 none) 4%);
    --continue-face-bottom: color-mix(in oklch, var(--continue-sand-deep), oklch(0 0 none) 5%);
    --continue-bevel: 0%;
    --continue-rim: 18%;
  }

  .continue:active:enabled .surface {
    transform: translateY(1.5px);
    filter: drop-shadow(0 0 0.5px oklch(0 0 0 / 0.3));
    transition-duration: var(--duration-micro);
    transition-timing-function: ease-out;
  }

  .continue:active:enabled .glyph {
    transform: translateY(1.5px);
    transition-duration: var(--duration-micro);
    transition-timing-function: ease-out;
  }

  .shade-top {
    stop-color: oklch(0 0 0 / 0);
  }

  .shade-bottom {
    stop-color: oklch(0 0 0 / 0);
  }

  .continue:active:enabled .shade-top {
    stop-color: oklch(from var(--sky-night) l c h / 0.4);
  }

  .face-top,
  .face-indigo,
  .face-middle,
  .face-dusk,
  .face-control,
  .face-light,
  .face-bottom {
    stop-color: var(--stop-color);
    transition: stop-color var(--duration-fast) var(--ease-smooth-out);
  }

  .face-top {
    --stop-color: var(--continue-face-top);
  }

  .face-indigo {
    --stop-color: var(--sky-indigo);
  }

  .face-middle {
    --stop-color: var(--sky-blue);
  }

  .face-dusk {
    --stop-color: var(--sky-dusk);
  }

  .face-control {
    --stop-color: var(--sky-control);
  }

  .face-light {
    --stop-color: var(--sky-light);
  }

  .face-bottom {
    --stop-color: var(--continue-face-bottom);
  }

  .highlight stop {
    stop-color: color-mix(in oklch, var(--stop-color), oklch(1 0 none) var(--continue-bevel));
  }

  .rim stop {
    stop-color: color-mix(in oklch, var(--stop-color), oklch(0 0 none) var(--continue-rim));
  }

  .arrow-top {
    stop-color: var(--continue-ink);
  }

  .arrow-bottom {
    stop-color: var(--continue-ink);
  }
</style>
