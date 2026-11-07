<script lang="ts" effect>
  import { Effect, Option } from "effect";
  import { page } from "$app/state";
  import { VITE_DASHBOARD_URL } from "$app/env/public";
  import "@artisanstreet/ui/secondary-button.css";
  import FeedbackLabel from "../lib/feedback/feedback.svelte";
  import AuthCard from "../lib/shell/auth-card.svelte";
  import Field from "../lib/shell/field.svelte";
  import Heading from "../lib/shell/heading.svelte";
  import Well from "../lib/shell/well.svelte";
  import google_url from "../lib/providers/google.svg?url";
  import github_url from "../lib/providers/github.svg?url";
  import { debug_scenes } from "../lib/debug/scenes.svelte.ts";
  import { dashboard_url } from "../lib/return-to.ts";
  import { abandon, complete, edited, Flow, sign_in } from "../lib/sign-in/flow.ts";
  import { Scene } from "../lib/sign-in/scenarios.ts";
  import { second_factor } from "../lib/sign-in/state.ts";
  import { OauthProblem, provider_problem_of, start_provider } from "../lib/sign-in/oauth.ts";
  import {
    checked_email,
    code_of,
    EmailField,
    email_of,
    FactorKind,
    Feedback,
    feedback_of,
    locked,
    Page,
    page_of,
    provider_feedback_of,
    SignInView,
    tone_of,
    typed_email,
    view_of,
    type Provider,
  } from "../lib/sign-in/view.ts";

  const destination = dashboard_url(VITE_DASHBOARD_URL, page.url.searchParams.get("return_to"));

  let value = $state("");
  let code = $state("");
  let kind: FactorKind = $state(FactorKind.Authenticator());
  let flow: Flow = $state(
    Option.match(provider_problem_of(page.url), {
      onNone: () => Flow.Idle(),
      onSome: ({ provider, problem }) => Flow.ProviderFailed({ provider, problem }),
    }),
  );
  let field: EmailField = $derived(typed_email(value));
  let generation = 0;
  let scene_shown = false;

  const scene_view = $derived(
    Option.fromNullishOr(debug_scenes.current?.scene).pipe(
      Option.filter(Scene.$is("SignIn")),
      Option.map((scene) => scene.view),
    ),
  );
  const view = $derived(Option.getOrElse(scene_view, () => view_of(flow, field, { kind, code })));
  const shown_page = $derived(page_of(view));
  const on_email = $derived(Page.$is("Email")(shown_page));
  const busy = $derived(locked(view));
  const feedback = $derived(feedback_of(view));
  const email_feedback = $derived(on_email ? feedback : Feedback.None());
  const code_feedback = $derived(on_email ? Feedback.None() : feedback);
  const tone = $derived(tone_of(email_feedback));
  const code_tone = $derived(tone_of(code_feedback));
  const providers: ReadonlyArray<{ id: Provider; name: string; url: string }> = [
    { id: "google", name: "Google", url: google_url },
    { id: "github", name: "GitHub", url: github_url },
  ];

  let height: number | undefined = $state();
  let settled = $state(false);
  let email_page: HTMLElement | undefined = $state();
  let code_page: HTMLElement | undefined = $state();

  const recovery = $derived(FactorKind.$is("Recovery")(kind));

  const reset_factor = () => {
    code = "";
    kind = FactorKind.Authenticator();
  };

  $effect(() => {
    Option.match(scene_view, {
      onNone: () => {
        if (scene_shown) {
          value = "";
          reset_factor();
        }
        scene_shown = false;
      },
      onSome: (scene) => {
        scene_shown = true;
        value = email_of(scene);
        code = code_of(scene);
        kind = SignInView.$is("SecondFactor")(scene) ? scene.kind : FactorKind.Authenticator();
      },
    });
  });

  const land = (next: Flow) =>
    Flow.$is("SignedIn")(next) ? Effect.sync(() => window.location.assign(next.destination)) : Effect.void;

  const emitter = (run: number) => (next: Flow) =>
    run === generation
      ? Effect.sync(() => {
          flow = next;
        }).pipe(Effect.andThen(land(next)))
      : Effect.void;

  const next_run = Effect.sync(() => (generation += 1));

  const submit_email = Effect.gen(function* () {
    const checked = checked_email(value);
    field = checked;
    yield* EmailField.$is("Filled")(checked) && !busy
      ? next_run.pipe(Effect.flatMap((run) => sign_in(checked.email, destination, emitter(run))))
      : Effect.void;
  });

  const submit_code = Effect.suspend(() =>
    Flow.$is("Approved")(flow) && !busy
      ? complete(flow.login, second_factor(recovery, code), destination, emitter(generation))
      : Effect.void,
  );

  const redirect = (provider: Provider) =>
    Effect.gen(function* () {
      yield* abandon(flow);
      yield* next_run;
      flow = Flow.Redirecting({ provider });
      yield* start_provider(provider, destination).pipe(
        Effect.catch(() =>
          Effect.sync(() => {
            flow = Flow.ProviderFailed({ provider, problem: OauthProblem.Unavailable() });
          }),
        ),
      );
    });

  const choose = (provider: Provider) => Effect.suspend(() => (busy ? Effect.void : redirect(provider)));

  const cancel = Effect.gen(function* () {
    yield* abandon(flow);
    yield* next_run;
    flow = Flow.Idle();
    reset_factor();
  });

  const on_edit = () => {
    flow = edited(flow);
  };

  $effect(() => {
    const active = on_email ? email_page : code_page;
    if (active === undefined) return;
    height = active.offsetHeight;
    const frame = requestAnimationFrame(() => {
      settled = true;
    });
    const observer = new ResizeObserver(() => {
      height = active.offsetHeight;
    });
    observer.observe(active);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  });
</script>

<AuthCard padded={false}>
            <div
              class="pages"
              data-page={on_email ? "1" : "2"}
              data-settled={settled}
              style:height={height === undefined ? undefined : `${height}px`}
            >
            <section class="page" data-page-id="1" inert={!on_email} bind:this={email_page}>
            <form class="fields" method="dialog" novalidate onsubmit={yield* submit_email}>
              <Field
                id="signin-email"
                label="Email"
                name="email"
                type="email"
                required
                autocomplete="email"
                aria-invalid={tone === "error"}
                aria-describedby="signin-feedback"
                {busy}
                bind:value
                oninput={on_edit}
                placeholder="you@artisan.email"
              />
              <FeedbackLabel feedback={email_feedback} id="signin-feedback" />
              <div class="divider" role="separator"><span>or</span></div>
              <div class="providers">
                {#each providers as provider (provider.id)}
                  {@const provider_feedback = provider_feedback_of(view, provider.id)}
                  <div class="slot">
                    <button
                      type="button"
                      class="provider secondary-button"
                      aria-label={`Continue with ${provider.name}`}
                      aria-describedby={`${provider.id}-feedback`}
                      disabled={busy}
                      onclick={yield* choose(provider.id)}
                    >
                      <span class="icon" style:--icon={`url("${provider.url}")`} aria-hidden="true"></span>
                    </button>
                  </div>
                {/each}
              </div>
              {#each providers as provider (provider.id)}
                <FeedbackLabel
                  feedback={provider_feedback_of(view, provider.id)}
                  id={`${provider.id}-feedback`}
                />
              {/each}
              <div class="legal">
                <Well>
                  By using Artisan Street services, you agree to our
                  <a href="/terms">Terms of Service</a> and
                  <a href="/privacy">Privacy Policy</a>. Click
                  <a href="/recover">here</a> to recover accounts.
                </Well>
              </div>
            </form>
            </section>
            <section class="page" data-page-id="2" inert={on_email} bind:this={code_page}>
            <form class="fields" method="dialog" novalidate onsubmit={yield* submit_code}>
              <div class="lead">
                <Heading
                  title="Two-step verification"
                  text={recovery
                    ? "Enter one of your saved recovery codes."
                    : "Enter the 6-digit code from your authenticator app."}
                />
              </div>
              <Field
                id="signin-code"
                label={recovery ? "Recovery code" : "Authenticator code"}
                name="code"
                spaced={!recovery}
                inputmode={recovery ? "text" : "numeric"}
                autocomplete={recovery ? "off" : "one-time-code"}
                aria-invalid={code_tone === "error"}
                aria-describedby="signin-code-feedback"
                {busy}
                bind:value={code}
                oninput={on_edit}
                placeholder={recovery ? "xxxx-xxxx-xxxx" : "123456"}
              />
              <FeedbackLabel feedback={code_feedback} id="signin-code-feedback" />
              <div class="cancel">
                <Well>Click <button type="button" onclick={yield* cancel}>here</button> if you want to cancel.</Well>
              </div>
            </form>
            </section>
            </div>
</AuthCard>

<style>

  .pages {
    position: relative;
    z-index: 2;
  }

  .pages[data-settled="true"] {
    transition: height var(--resize-dur) var(--ease-smooth-out);
  }

  .page {
    position: absolute;
    inset: 0 0 auto 0;
    opacity: 0;
    pointer-events: none;
    transform: translateX(calc(var(--t-page-from-x, 0px) * var(--page-exit-enabled)));
    filter: blur(calc(var(--page-blur) * var(--page-exit-enabled)));
    transition:
      opacity var(--page-fade-dur) var(--page-fade-ease),
      transform var(--page-slide-dur) var(--page-slide-ease),
      filter var(--page-slide-dur) var(--page-slide-ease);
    will-change: opacity, transform, filter;
  }

  .page[data-page-id="1"] {
    --t-page-from-x: calc(var(--page-slide-distance) * -1);
  }

  .page[data-page-id="2"] {
    --t-page-from-x: var(--page-slide-distance);
  }

  .pages[data-page="1"] .page[data-page-id="1"],
  .pages[data-page="2"] .page[data-page-id="2"] {
    position: relative;
    opacity: 1;
    pointer-events: auto;
    transform: translateX(0);
    filter: blur(0);
    transition-delay: var(--page-stagger);
  }

  @media (prefers-reduced-motion: reduce) {
    .pages,
    .page {
      transition: none !important;
    }
  }

  .lead {
    margin-bottom: var(--sp-4);
  }

  .legal {
    margin-top: calc(var(--sp-8) * 1.5);
  }

  .cancel {
    margin-top: var(--sp-4);
  }

  .fields {
    position: relative;
    z-index: 2;
    padding: var(--field-inset);
  }

  .divider {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    margin: var(--sp-4) 0;
    font-size: 0.75rem;
    line-height: 1rem;
    color: var(--ink-dim);
  }

  .divider::before,
  .divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: color-mix(in oklch, var(--ink) 18%, transparent);
  }

  .divider::after {
    flex: 3;
  }

  .icon {
    display: block;
    width: 18px;
    height: 18px;
    background-color: var(--ink-dim);
    mask: var(--icon) center / contain no-repeat;
  }

  .providers {
    display: flex;
    gap: var(--sp-3);
  }

  .slot {
    display: flex;
    flex: 1;
    min-width: 0;
  }

  .provider {
    --secondary-button-radius: var(--field-radius);
    --secondary-button-height: var(--field-height);
    flex: 1;
    width: 100%;
  }


</style>
