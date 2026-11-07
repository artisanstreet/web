<script lang="ts" effect>
  import { Data, Effect, Option } from "effect";
  import { Dialog } from "bits-ui";
  import { CoreApi, type ProfileResp } from "@artisanstreet/core-client";
  import AvatarCrop from "./avatar-crop.svelte";
  import { crop_bounds, type Framing, type ImageSize } from "./avatar-crop.ts";
  import Card from "../card/card.svelte";
  import Button from "./button.svelte";
  import DestructiveActions from "./destructive-actions.svelte";
  import EmailMenu from "./email-menu.svelte";
  import type { Snapshot } from "./model.ts";
  import { profile_state } from "../account/profile-state.svelte.ts";
  import { friendly_error } from "./messages.ts";
  import fallback_glyph from "../assets/user.svg?url";
  import google_glyph from "../assets/google.svg?url";
  import github_glyph from "../assets/github.svg?url";

  class InvalidImage extends Data.TaggedError("InvalidImage") {}

  let { snapshot }: { snapshot: Snapshot } = $props();
  const api = yield* CoreApi;
  let error = $state("");
  const initial_profile = yield* api.profile.pipe(Effect.catch((failure) => Effect.sync(() => {
    error = friendly_error(failure);
    return null;
  })));
  let profile: ProfileResp | null = $state(initial_profile);
  let display_name = $state(initial_profile?.display_name ?? "");
  let username = $state(initial_profile?.username ?? "");
  let busy = $state(false);
  let saving = $state<"name" | "username" | "phone" | null>(null);
  let saved = $state<"name" | "username" | "phone" | null>(null);
  let save_timer: ReturnType<typeof setTimeout> | undefined;
  const show_saved = (field: "name" | "username" | "phone") => {
    saved = field;
    clearTimeout(save_timer);
    save_timer = setTimeout(() => { saved = null; }, 2000);
  };
  $effect(() => () => clearTimeout(save_timer));
  let phone = $state(initial_profile?.phone ?? "");
  let copied = $state(false);
  let copy_error = $state("");
  let copy_timer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => () => clearTimeout(copy_timer));
  let scroll_above = $state(false);
  let scroll_below = $state(false);

  const track_scroll = (node: HTMLElement) => {
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

  const save_name = Effect.gen(function* () {
    busy = true;
    saving = "name";
    saved = null;
    error = "";
    profile = yield* api.update_profile_name(display_name.trim());
    display_name = profile.display_name;
    profile_state.invalidate();
    show_saved("name");
  }).pipe(
    Effect.catch((failure) => Effect.sync(() => { error = friendly_error(failure); })),
    Effect.ensuring(Effect.sync(() => { busy = false; saving = null; })),
  );

  const save_username = Effect.gen(function* () {
    busy = true;
    saving = "username";
    saved = null;
    error = "";
    const normalized = username.trim().toLowerCase();
    profile = yield* api.update_profile_username(normalized);
    username = profile.username ?? "";
    profile_state.invalidate();
    show_saved("username");
  }).pipe(
    Effect.catch((failure) => Effect.sync(() => { error = friendly_error(failure); })),
    Effect.ensuring(Effect.sync(() => { busy = false; saving = null; })),
  );

  const save_phone = Effect.gen(function* () {
    busy = true;
    saving = "phone";
    saved = null;
    error = "";
    const normalized = phone.trim().replace(/[\s().-]/g, "");
    profile = yield* api.update_profile_phone(normalized || null);
    phone = profile.phone ?? "";
    profile_state.invalidate();
    show_saved("phone");
  }).pipe(
    Effect.catch((failure) => Effect.sync(() => { error = friendly_error(failure); })),
    Effect.ensuring(Effect.sync(() => { busy = false; saving = null; })),
  );

  const copy_id = Effect.gen(function* () {
    yield* Effect.tryPromise({ try: () => navigator.clipboard.writeText(snapshot.me.account_id), catch: () => new Error("Clipboard unavailable") });
    copy_error = "";
    copied = true;
    clearTimeout(copy_timer);
    copy_timer = setTimeout(() => { copied = false; }, 2000);
  }).pipe(Effect.catch(() => Effect.sync(() => { copy_error = "Could not copy user ID."; })));

  let selected_image = $state.raw(Option.none<ImageSize & { readonly file: File; readonly url: string }>());
  let framing = $state<Framing>({ x: 0.5, y: 0.5, zoom: 1 });
  let avatar_error = $state("");
  let saving_avatar = $state(false);

  $effect(() => {
    const selected = selected_image;
    return () => { Option.map(selected, (image) => URL.revokeObjectURL(image.url)); };
  });

  const choose_avatar = (event: Event) => Effect.gen(function* () {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || busy) return;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    busy = true;
    avatar_error = "";
    if (file.size > 10 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return yield* Effect.fail(new InvalidImage());
    }
    const image = yield* Effect.acquireRelease(
      Effect.tryPromise({ try: () => createImageBitmap(file), catch: () => new InvalidImage() }),
      (bitmap) => Effect.sync(() => bitmap.close()),
    );
    if (image.width < 1 || image.height < 1) return yield* Effect.fail(new InvalidImage());
    const url = yield* Effect.sync(() => URL.createObjectURL(file));
    framing = { x: 0.5, y: 0.5, zoom: 1 };
    selected_image = Option.some({ file, url, width: image.width, height: image.height });
  }).pipe(
    Effect.scoped,
    Effect.catch(() => Effect.sync(() => { avatar_error = "Choose a JPEG, PNG, or WebP image under 10 MB."; })),
    Effect.ensuring(Effect.sync(() => { busy = false; })),
  );

  const cancel_avatar = () => {
    selected_image = Option.none();
    avatar_error = "";
  };

  const save_avatar = Effect.gen(function* () {
    if (busy || Option.isNone(selected_image)) return;
    const selected = selected_image.value;
    const bounds = crop_bounds(selected, framing);
    busy = true;
    saving_avatar = true;
    avatar_error = "";
    const image = yield* Effect.acquireRelease(
      Effect.tryPromise({ try: () => createImageBitmap(selected.file), catch: () => new InvalidImage() }),
      (bitmap) => Effect.sync(() => bitmap.close()),
    );
    const canvas = yield* Effect.sync(() => document.createElement("canvas"));
    canvas.width = 256;
    canvas.height = 256;
    const context = yield* Effect.sync(() => canvas.getContext("2d"));
    if (!context) return yield* Effect.fail(new InvalidImage());
    const avatar = yield* Effect.try({
      try: () => {
        context.fillStyle = "oklch(1 0 0)";
        context.fillRect(0, 0, 256, 256);
        context.drawImage(image, bounds.x, bounds.y, bounds.size, bounds.size, 0, 0, 256, 256);
        return canvas.toDataURL("image/jpeg", 0.86);
      },
      catch: () => new InvalidImage(),
    });
    profile = yield* api.update_profile_avatar(avatar);
    profile_state.invalidate();
    cancel_avatar();
  }).pipe(
    Effect.scoped,
    Effect.catch((failure) => Effect.sync(() => {
      avatar_error = failure instanceof InvalidImage ? "Could not process this image. Try choosing another picture." : friendly_error(failure);
    })),
    Effect.ensuring(Effect.sync(() => { busy = false; saving_avatar = false; })),
  );
</script>

{#snippet save_indicator(field: "name" | "username" | "phone")}
  <span class="save-label" aria-hidden="true" data-visible={saving !== field && saved !== field}>Save</span>
  <span class="save-status t-icon-swap" data-state={saved === field ? "b" : "a"} data-visible={saving === field || saved === field} aria-hidden="true">
    <svg class="t-icon save-spinner" data-icon="a" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8" opacity=".2"/><path d="M12 4a8 8 0 0 1 8 8"/></svg>
    <svg class="t-icon" data-icon="b" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg>
  </span>
{/snippet}

{#if profile}
  <div class="profile-card">
    <Card surface="var(--card-inner)" radius="var(--radius-md)">
      <div class="profile-frame">
      <div class="profile-scroll" {@attach track_scroll}>
      <div class="profile-fields">
        <div class="field field-form">
          <div class="avatar-row">
          <div class="field-copy">
            <h3>Avatar</h3>
            <p>Choose a picture for your account.</p>
          </div>
          <label class="avatar-control" aria-label="Choose avatar" aria-disabled={busy}>
            {#if profile.avatar_url}
              <img src={profile.avatar_url} alt="" />
            {:else}
              <span class="avatar-fallback" style:--icon={`url("${fallback_glyph}")`}></span>
            {/if}
            <input class="file-input" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onchange={yield* choose_avatar(event)} />
          </label>
          </div>
          {#if avatar_error && Option.isNone(selected_image)}<p class="error" role="alert">{avatar_error}</p>{/if}
        </div>
        <div class="field field-form">
          <div class="field-copy">
            <h3><label for="profile-name">Display name</label></h3>
            <p>The name shown across Artisan.</p>
          </div>
          <div class="editor" data-saving={saving === "name"} data-saved={saved === "name"}>
            <div class="input-card"><Card surface="var(--bg)" radius="var(--radius-sm)">
              <input id="profile-name" type="text" maxlength="120" autocomplete="name" bind:value={display_name} disabled={busy} />
            </Card></div>
            <Button tone="sand" disabled={busy || !display_name.trim() || display_name.trim() === profile.display_name} aria-label={saving === "name" ? "Saving display name" : saved === "name" ? "Display name saved" : "Save display name"} onclick={yield* save_name}>
              {@render save_indicator("name")}</Button>
          </div>
        </div>
        <div class="field field-form">
          <div class="field-copy">
            <h3><label for="profile-username">Username</label></h3>
            <p>Your unique name on Artisan.</p>
          </div>
          <div class="editor" data-saving={saving === "username"} data-saved={saved === "username"}>
            <div class="input-card"><Card surface="var(--bg)" radius="var(--radius-sm)">
              <div class="username-input"><span aria-hidden="true">@</span><input id="profile-username" type="text" maxlength="32" autocomplete="username" spellcheck="false" bind:value={username} disabled={busy} /></div>
            </Card></div>
            <Button tone="sand" disabled={busy || !/^[a-z0-9][a-z0-9_-]{0,31}$/.test(username.trim().toLowerCase()) || username.trim().toLowerCase() === profile.username} aria-label={saving === "username" ? "Saving username" : saved === "username" ? "Username saved" : "Save username"} onclick={yield* save_username}>
              {@render save_indicator("username")}</Button>
          </div>
        </div>
        <div class="field field-form">
          <div class="field-copy"><h3>Emails</h3><p>Your account email addresses.</p></div>
          <ol class="email-list">
            <li class="email-row"><span>{snapshot.me.email}</span><span class="badge">Primary</span><EmailMenu email={snapshot.me.email} /></li>
            {#if import.meta.env.DEV}
              <li class="email-row"><span>alex@example.com</span><span class="badge provider-badge" aria-label="Example: Google"><span class="provider-icon" style:--icon={`url("${google_glyph}")`} aria-hidden="true"></span>Google</span><EmailMenu email="alex@example.com" /></li>
              <li class="email-row"><span>alex.morgan.personal@example.com</span><span class="badge provider-badge" aria-label="Example: GitHub"><span class="provider-icon" style:--icon={`url("${github_glyph}")`} aria-hidden="true"></span>GitHub</span><EmailMenu email="alex.morgan.personal@example.com" /></li>
              <li class="email-row"><span>alexander.morgan.workspace@example.org</span><span class="badge">Example</span><EmailMenu email="alexander.morgan.workspace@example.org" /></li>
            {/if}
          </ol>
        </div>
        <div class="field field-form">
          <div class="field-copy"><h3><label for="profile-phone">Phone number</label></h3><p>An optional contact number. This number is not verified.</p></div>
          <div class="editor" data-saving={saving === "phone"} data-saved={saved === "phone"}>
            <div class="input-card"><Card surface="var(--bg)" radius="var(--radius-sm)">
              <input id="profile-phone" type="tel" autocomplete="tel" placeholder="+1 555 123 4567" bind:value={phone} disabled={busy} />
            </Card></div>
            <Button tone="sand" disabled={busy || (phone.trim().replace(/[\s().-]/g, "") !== "" && !/^\+[1-9][0-9]{7,14}$/.test(phone.trim().replace(/[\s().-]/g, ""))) || (phone.trim().replace(/[\s().-]/g, "") || null) === profile.phone} aria-label={saving === "phone" ? "Saving phone number" : saved === "phone" ? "Phone number saved" : "Save phone number"} onclick={yield* save_phone}>
              {@render save_indicator("phone")}</Button>
          </div>
        </div>
        <div class="field field-form">
          <div class="field-copy"><h3>User ID</h3><p>Your unique Artisan account identifier.</p></div>
          <div class="id-row"><code>{snapshot.me.account_id}</code><button class="copy" type="button" aria-label={copied ? "User ID copied" : "Copy user ID"} onclick={yield* copy_id}><span class="t-icon-swap" data-state={copied ? "b" : "a"}><svg class="t-icon" data-icon="a" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1"/></svg><svg class="t-icon" data-icon="b" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></span></button></div>
          {#if copy_error}<p class="error" role="alert">{copy_error}</p>{/if}
        </div>
        <div class="field"><DestructiveActions {snapshot} /></div>
        {#if error}<p class="error" role="alert">{error}</p>{/if}
      </div>
      </div>
      <div class="scroll-fade top" data-visible={scroll_above} aria-hidden="true"></div>
      <div class="scroll-fade bottom" data-visible={scroll_below} aria-hidden="true"></div>
      </div>
    </Card>
  </div>
{:else if error}
  <p class="error" role="alert">{error}</p>
{:else}
  <p class="hint" role="status">Loading profile…</p>
{/if}

<Dialog.Root open={Option.isSome(selected_image)} onOpenChange={(open) => { if (!open && !busy) cancel_avatar(); }}>
  <Dialog.Portal>
    <Dialog.Overlay class="avatar-crop-overlay" />
    <Dialog.Content class="avatar-crop-dialog" aria-describedby="avatar-crop-help" onEscapeKeydown={(event) => { if (busy) event.preventDefault(); }} onInteractOutside={(event) => { if (busy) event.preventDefault(); }}>
      <Card surface="var(--card-inner)" radius="var(--radius-lg)">
        <div class="avatar-dialog-body">
          <Dialog.Title class="avatar-crop-title">Crop avatar</Dialog.Title>
          {#if Option.isSome(selected_image)}
            <AvatarCrop image={selected_image.value} bind:framing disabled={busy} />
          {/if}
          {#if avatar_error}<p class="error" role="alert">{avatar_error}</p>{/if}
          <div class="avatar-actions">
            <Button tone="secondary" disabled={busy} onclick={cancel_avatar}>Cancel</Button>
            <Button tone="sand" disabled={busy} onclick={yield* save_avatar}>{saving_avatar ? "Saving…" : "Save avatar"}</Button>
          </div>
        </div>
      </Card>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  .profile-card { display: flex; flex: 1; min-height: 0; }
  .profile-card > :global(.card) > :global(.outline) { z-index: 4; }
  .profile-frame { position: relative; display: flex; flex: 1; flex-direction: column; min-height: 0; overflow: hidden; border-radius: var(--radius-md); }
  .profile-scroll { min-height: 0; overflow-y: auto; scrollbar-width: none; }
  .profile-scroll::-webkit-scrollbar { display: none; }
  .scroll-fade { position: absolute; z-index: 3; right: 0; left: 0; height: var(--sp-8); pointer-events: none; opacity: 0; transition: opacity var(--duration-quick) var(--ease-smooth-out); }
  .scroll-fade[data-visible="true"] { opacity: 1; }
  .scroll-fade.top { top: 0; background: linear-gradient(to bottom, var(--card-inner), transparent); }
  .scroll-fade.bottom { bottom: 0; background: linear-gradient(to top, var(--card-inner), transparent); }
  @media (prefers-reduced-motion: reduce) { .scroll-fade { transition: none; } }
  .profile-fields { position: relative; z-index: 2; display: flex; flex-direction: column; }
  .field { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4); padding: var(--sp-8); }
  .field + .field { box-shadow: inset 0 1px 0 var(--rule-shade), inset 0 2px 0 var(--rule-light); }
  .field-form { align-items: stretch; flex-direction: column; }
  .field-copy { display: flex; flex-direction: column; gap: var(--sp-1); }
  h3 { margin: 0; color: var(--ink); font-size: 0.875rem; font-weight: 500; line-height: 1.25rem; }
  p { margin: 0; color: var(--ink-dim); font-size: 0.8125rem; line-height: 1.2rem; }
  .editor { display: flex; align-items: stretch; }
  .editor { transition: transform var(--duration-quick) var(--ease-smooth-out); }
  .editor:has(> :global(.button:active:enabled)) { transform: translateY(1.5px); transition-duration: var(--duration-micro); }
  .editor > :global(.button) { margin-left: calc(-1 * var(--sp-2)); padding-left: calc(var(--sp-3) + var(--sp-2)); border-radius: var(--radius-sm); }
  .editor > :global(.button:active:enabled) { transform: none; }
  .editor[data-saving="true"] > :global(.button), .editor[data-saved="true"] > :global(.button) { opacity: 1; }
  .editor > :global(.button)::before { content: ""; position: absolute; inset: -1px; border-radius: inherit; background: linear-gradient(oklch(0.8 0.12 145), oklch(0.62 0.14 145)); box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.3); opacity: 0; transition: opacity var(--icon-swap-dur) var(--icon-swap-ease); }
  .editor[data-saved="true"] > :global(.button)::before { opacity: 1; }
  .save-label { position: relative; visibility: hidden; }
  .save-label[data-visible="true"] { visibility: visible; }
  .save-status { position: absolute; z-index: 1; left: calc(50% + var(--sp-1)); top: 50%; translate: -50% -50%; color: oklch(0.27 0.025 70); opacity: 0; transition: opacity var(--icon-swap-dur) var(--icon-swap-ease); }
  .save-status[data-visible="true"] { opacity: 1; }
  .save-spinner { animation: save-spin 0.8s linear infinite; }
  @keyframes save-spin { to { rotate: 360deg; } }
  @media (prefers-reduced-motion: reduce) { .editor, .save-status, .editor > :global(.button)::before { transition: none; } .save-spinner { animation: none; } }
  .input-card { position: relative; z-index: 1; display: flex; width: min(20rem, 100%); min-width: 0; }
  .input-card :global(.card) { overflow: hidden; }
  .input-card :global(.card)::before { content: ""; position: absolute; inset: 0; z-index: 3; border-radius: inherit; pointer-events: none; mask-image: linear-gradient(to bottom, transparent, black 12px, black calc(100% - 12px), transparent); background: radial-gradient(ellipse 32px 100% at 32px 50%, oklch(1 0 0 / 0) 66%, oklch(1 0 0 / 0.05) 96%, oklch(1 0 0 / 0) 100%) left / 32px 100% no-repeat, radial-gradient(ellipse 32px 100% at 0 50%, oklch(1 0 0 / 0) 66%, oklch(1 0 0 / 0.05) 96%, oklch(1 0 0 / 0) 100%) right / 32px 100% no-repeat; }
  .editor input { position: relative; z-index: 2; display: block; width: 100%; min-width: 0; min-height: 2.25rem; padding: var(--sp-1) var(--sp-3); color: var(--ink); font: inherit; font-size: 0.875rem; border: 0; border-radius: inherit; outline: none; background: transparent; }
  .username-input { display: flex; align-items: center; }
  .username-input span { position: relative; z-index: 2; padding-left: var(--sp-3); color: var(--ink-dim); }
  .username-input input { flex: 1; width: 0; padding-left: var(--sp-1); }
  :global(.avatar-crop-overlay) { position: fixed; inset: 0; z-index: 100; background: oklch(0 0 0 / 0.65); backdrop-filter: blur(6px); }
  :global(.avatar-crop-dialog) { position: fixed; z-index: 101; top: 50%; left: 50%; width: min(26rem, calc(100vw - 2rem)); max-height: calc(100dvh - 2rem); overflow-y: auto; border-radius: var(--radius-lg); outline: none; transform: translate(-50%, -50%); }
  :global(.avatar-crop-title) { margin: 0; color: var(--ink); font-size: 1rem; font-weight: 600; line-height: 1.4; }
  .avatar-dialog-body { position: relative; z-index: 2; display: flex; flex-direction: column; gap: var(--sp-4); padding: var(--sp-6); }
  .avatar-row { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4); }
  .avatar-actions { display: flex; justify-content: flex-end; gap: var(--sp-2); }
  .avatar-control:has(input:focus-visible) { outline: 2px solid var(--focus); outline-offset: 3px; }
  .avatar-control { position: relative; display: grid; flex: none; place-items: center; width: 4.5rem; height: 4.5rem; overflow: hidden; color: var(--ink); border-radius: var(--radius-sm); background: var(--bg-raised); cursor: pointer; }
  .avatar-control img { width: 100%; height: 100%; object-fit: cover; }
  .avatar-fallback { width: 1.5rem; height: 1.5rem; background: var(--ink-dim); mask: var(--icon) center / contain no-repeat; }
  .avatar-control::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.32), inset 1px 0 0 oklch(1 0 0 / 0.14), inset -1px 0 0 oklch(1 0 0 / 0.14), inset 0 -1px 0 oklch(0 0 0 / 0.45), inset 0 2px 0 oklch(1 0 0 / 0.1), inset 2px 0 0 oklch(1 0 0 / 0.06), inset -2px 0 0 oklch(1 0 0 / 0.06), inset 0 -2px 0 oklch(0 0 0 / 0.2); }
  .file-input { position: absolute; width: 1px; height: 1px; opacity: 0; }
  .email-row, .id-row { display: flex; align-items: center; gap: var(--sp-3); max-width: 100%; color: var(--ink); font-size: 0.875rem; }
  .email-list { display: flex; flex-direction: column; gap: var(--sp-2); margin: 0; padding: 0; list-style: none; counter-reset: email-priority; }
  .email-row { flex-wrap: wrap; min-width: 0; overflow-wrap: anywhere; counter-increment: email-priority; }
  .email-row :global(.email-menu-trigger) { margin-left: auto; }
  .email-row::before { content: counter(email-priority) "."; color: var(--ink-dim); font-variant-numeric: tabular-nums; }
  .id-row { width: fit-content; }
  .badge { padding: var(--sp-1) var(--sp-2); border-radius: var(--radius-sm); background: var(--bg); color: var(--ink); font-size: 0.75rem; }
  .provider-badge { display: inline-flex; align-items: center; gap: var(--sp-1); }
  .provider-icon { width: 0.875rem; height: 0.875rem; background: var(--ink-dim); mask: var(--icon) center / contain no-repeat; }
  .id-row { padding: var(--sp-2) var(--sp-3); border-radius: var(--radius-sm); background: var(--bg); }
  .id-row code { overflow-wrap: anywhere; }
  .copy { display: grid; place-items: center; flex: none; padding: var(--sp-1); color: var(--ink-dim); border: 0; border-radius: var(--radius-sm); background: transparent; cursor: pointer; }
  .t-icon-swap {
    position: relative;
    display: inline-grid;
  }
  .save-status.t-icon-swap { position: absolute; }
  .t-icon-swap .t-icon {
    grid-area: 1 / 1;
    transition:
      opacity   var(--icon-swap-dur) var(--icon-swap-ease),
      filter    var(--icon-swap-dur) var(--icon-swap-ease),
      transform var(--icon-swap-dur) var(--icon-swap-ease);
    will-change: opacity, filter, transform;
  }
  .t-icon-swap[data-state="a"] .t-icon[data-icon="a"],
  .t-icon-swap[data-state="b"] .t-icon[data-icon="b"] {
    opacity: 1;
    filter: blur(0);
    transform: scale(1);
  }
  .t-icon-swap[data-state="a"] .t-icon[data-icon="b"],
  .t-icon-swap[data-state="b"] .t-icon[data-icon="a"] {
    opacity: 0;
    filter: blur(var(--icon-swap-blur));
    transform: scale(var(--icon-swap-start-scale));
  }
  @media (prefers-reduced-motion: reduce) {
    .save-status.t-icon-swap { position: absolute; }
  .t-icon-swap .t-icon { transition: none !important; }
  }
  .copy:hover { color: var(--ink); background: var(--hover-fill); }
  .error { margin: 0; color: var(--err); font-size: 0.8125rem; }
  @media (max-width: 40rem) { .field { flex-wrap: wrap; } }
</style>
