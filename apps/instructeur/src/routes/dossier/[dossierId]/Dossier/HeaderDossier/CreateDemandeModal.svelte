<script lang="ts">
  import { onMount, type Snippet } from "svelte";

  let {
    busy,
    onClose,
    children,
  }: {
    busy: boolean;
    onClose: () => void;
    children: Snippet;
  } = $props();
  let dialog: HTMLDialogElement;

  onMount(() => {
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>("input")?.focus();
  });
</script>

<dialog
  bind:this={dialog}
  class="w-[min(36rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] border-0 fr-p-0 pitchou-dialog"
  style="margin: auto;"
  aria-labelledby="create-demande-title"
  onclose={onClose}
  oncancel={(event) => {
    if (busy) event.preventDefault();
  }}
>
  <div
    class="flex items-start justify-between gap-4 border-b border-[var(--border-default-grey)] fr-p-3w"
  >
    <h2 id="create-demande-title" class="fr-h4 fr-m-0">Nouvelle demande</h2>
    <button
      type="button"
      class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-close-line"
      disabled={busy}
      onclick={() => dialog.close()}>Fermer</button
    >
  </div>
  <div class="fr-p-3w">{@render children()}</div>
</dialog>
