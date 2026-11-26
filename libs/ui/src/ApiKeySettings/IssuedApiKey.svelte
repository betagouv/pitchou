<script lang="ts">
  import { onMount } from "svelte";
  import type { ApiKeySummary } from "@pitchou/types/externalApi.ts";

  let {
    issued,
    inDialog = false,
    onDismiss,
  }: {
    issued: { key: ApiKeySummary; secret: string };
    inDialog?: boolean;
    onDismiss?: () => void;
  } = $props();
  const inputId = $props.id();
  let tokenInput: HTMLInputElement;
  let feedback = $state("");

  onMount(() => {
    if (inDialog) tokenInput.focus();
  });

  async function copy() {
    const input = tokenInput;
    try {
      await navigator.clipboard.writeText(issued.secret);
      feedback = "Clé copiée.";
    } catch {
      if (!input.isConnected) return;
      input.focus();
      input.select();
      feedback = "Copiez le jeton sélectionné.";
    }
  }
</script>

<div class={inDialog ? "flex min-w-0 flex-col gap-4" : "fr-alert fr-alert--info min-w-0"}>
  <p
    class={inDialog ? "m-0! [overflow-wrap:anywhere]" : "mb-3! [overflow-wrap:anywhere]"}
    role="status"
  >
    {#if inDialog}
      Copiez la clé « {issued.key.label} » avant de fermer cette fenêtre. Elle ne sera plus affichée.
    {:else}
      Copiez la clé « {issued.key.label} ». Elle est affichée une seule fois.
    {/if}
  </p>
  <div>
    <label class="fr-label" for={inputId}>Jeton d’accès</label>
    <div
      class={inDialog
        ? "mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
        : "mt-2"}
    >
      <input
        id={inputId}
        class="fr-input box-border min-w-0 font-mono"
        value={issued.secret}
        bind:this={tokenInput}
        autocomplete="off"
        spellcheck={false}
        readonly
      />
      {#if inDialog}
        <button type="button" class="fr-btn justify-self-end" onclick={copy}>Copier la clé</button>
      {/if}
    </div>
  </div>
  {#if !inDialog}
    <div class="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" class="fr-btn fr-btn--sm" onclick={copy}>Copier la clé</button>
      {#if onDismiss}
        <button type="button" class="fr-btn fr-btn--secondary fr-btn--sm" onclick={onDismiss}>
          Masquer
        </button>
      {/if}
    </div>
  {/if}
  {#if feedback}<p class="fr-text--sm m-0!" role="status">{feedback}</p>{/if}
</div>
