<script lang="ts">
  import { theme_name, theme_state } from "./state.svelte.ts";

  let seen = theme_state.current;
  let animate = $state(false);

  $effect.pre(() => {
    const now = theme_state.current;
    animate = animate || now !== seen;
    seen = now;
  });
</script>

<svg
  class="sky"
  data-state={theme_name(theme_state.current)}
  data-animate={animate}
  viewBox="0 0 24 24"
  width="16"
  height="16"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>
  <g class="rays">
    <path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" />
  </g>
  <g class="core">
    <path d="M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
  </g>
  <g class="moon">
    <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454l0 .008" />
  </g>
</svg>

<style>
  .sky {
    --sky-blur: 2px;
    --sky-shrink: 0.6;
    --sky-turn: 40deg;
    --sky-reveal: calc(var(--duration-fast) + var(--duration-micro));
    flex: none;
    margin-left: auto;
    overflow: visible;
    color: var(--ink-dim);
  }

  .sky g {
    transform-box: view-box;
    transform-origin: 50% 50%;
    will-change: opacity, transform, filter;
  }

  .sky[data-state="dark"] :is(.rays, .core),
  .sky[data-state="light"] .moon {
    opacity: 0;
  }

  .sky[data-animate="true"][data-state="dark"] .rays {
    animation: rays-out var(--duration-quick) var(--ease-smooth-out) both;
  }

  .sky[data-animate="true"][data-state="dark"] .core {
    animation: body-out var(--duration-quick) var(--ease-in-out) var(--duration-quick) both;
  }

  .sky[data-animate="true"][data-state="dark"] .moon {
    animation: moon-in var(--duration-fast) var(--ease-smooth-out) var(--sky-reveal) both;
  }

  .sky[data-animate="true"][data-state="light"] .moon {
    animation: moon-out var(--duration-quick) var(--ease-smooth-out) both;
  }

  .sky[data-animate="true"][data-state="light"] .core {
    animation: body-in var(--duration-fast) var(--ease-smooth-out) var(--sky-reveal) both;
  }

  .sky[data-animate="true"][data-state="light"] .rays {
    animation: rays-in var(--duration-fast) var(--ease-smooth-out) calc(var(--sky-reveal) + var(--duration-stagger)) both;
  }

  @keyframes rays-out {
    from {
      opacity: 1;
      transform: none;
    }

    to {
      opacity: 0;
      transform: rotate(var(--sky-turn)) scale(var(--sky-shrink));
    }
  }

  @keyframes rays-in {
    from {
      opacity: 0;
      transform: rotate(calc(-1 * var(--sky-turn))) scale(var(--sky-shrink));
    }

    to {
      opacity: 1;
      transform: none;
    }
  }

  @keyframes body-out {
    from {
      opacity: 1;
      filter: blur(0);
      transform: none;
    }

    to {
      opacity: 0;
      filter: blur(var(--sky-blur));
      transform: scale(var(--sky-shrink));
    }
  }

  @keyframes body-in {
    from {
      opacity: 0;
      filter: blur(var(--sky-blur));
      transform: scale(var(--sky-shrink));
    }

    to {
      opacity: 1;
      filter: blur(0);
      transform: none;
    }
  }

  @keyframes moon-in {
    from {
      opacity: 0;
      filter: blur(var(--sky-blur));
      transform: rotate(calc(-1 * var(--sky-turn))) scale(var(--sky-shrink));
    }

    to {
      opacity: 1;
      filter: blur(0);
      transform: none;
    }
  }

  @keyframes moon-out {
    from {
      opacity: 1;
      filter: blur(0);
      transform: none;
    }

    to {
      opacity: 0;
      filter: blur(var(--sky-blur));
      transform: rotate(var(--sky-turn)) scale(var(--sky-shrink));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sky g {
      animation: none !important;
    }
  }
</style>
