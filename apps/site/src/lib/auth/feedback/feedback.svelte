<script lang="ts">
  import { Feedback, tone_of } from "../sign-in/view.ts";

  let { feedback, id }: { feedback: Feedback; id: string } = $props();

  let message = $state("");
  const tone = $derived(tone_of(feedback));

  $effect(() => {
    Feedback.$match(feedback, {
      None: () => {},
      Error: ({ message: next }) => {
        message = next;
      },
      Success: ({ message: next }) => {
        message = next;
      },
    });
  });
</script>

<div class="feedback" data-tone={tone}>
  <div class="inner">
    <p {id} role={tone === "error" ? "alert" : "status"}>{message}</p>
  </div>
</div>

<style>
  .feedback {
    --tone: transparent;
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows var(--duration-fast) var(--ease-smooth-out);
  }

  .feedback[data-tone="error"] {
    --tone: oklch(0.66 0.2 22);
  }

  .feedback[data-tone="success"] {
    --tone: oklch(0.74 0.17 152);
  }

  .feedback[data-tone="error"],
  .feedback[data-tone="success"] {
    grid-template-rows: 1fr;
  }

  .inner {
    min-height: 0;
    overflow: hidden;
  }

  p {
    margin: 0;
    padding-top: var(--sp-2);
    font-size: 0.75rem;
    line-height: 1.125rem;
    color: color-mix(in oklch, var(--tone) 85%, var(--ink));
    opacity: 0;
    filter: blur(2px);
    transform: translateY(-4px);
    transition:
      opacity var(--revert-dur) ease-out,
      filter var(--revert-dur) ease-out,
      transform var(--duration-fast) var(--ease-smooth-out),
      color var(--revert-dur) ease-out;
  }

  .feedback[data-tone="error"] p,
  .feedback[data-tone="success"] p {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0);
  }
</style>
