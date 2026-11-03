<script lang="ts">
  import Card from "../card/card.svelte";

  let {
    id,
    label,
    value = $bindable(""),
    placeholder = "123456",
    readonly = false,
  }: { id: string; label: string; value?: string; placeholder?: string; readonly?: boolean } = $props();
</script>

<div class="field">
  <label for={id}>{label}</label>
  <div class="box">
    <Card surface="var(--bg)" radius="calc(var(--radius-md) - 6px)">
      <input {id} autocomplete="one-time-code" inputmode="text" spellcheck="false" {placeholder} {readonly} bind:value />
    </Card>
  </div>
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    max-width: 16rem;
  }

  label {
    font-size: 0.8125rem;
    line-height: 1.125rem;
    color: var(--ink-dim);
  }

  .box {
    display: flex;
    height: 2.25rem;
  }

  input {
    position: relative;
    z-index: 2;
    width: 100%;
    height: 100%;
    padding: 0 var(--sp-3);
    font: inherit;
    font-size: 0.875rem;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
    color: var(--ink);
    background: transparent;
    border: 0;
    border-radius: inherit;
    outline: none;
  }

  input::placeholder {
    color: var(--ink-dim);
    opacity: 1;
  }
</style>
