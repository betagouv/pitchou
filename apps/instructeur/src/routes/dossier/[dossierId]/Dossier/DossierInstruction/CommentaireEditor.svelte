<script lang="ts">
  import { onMount } from "svelte";

  let {
    content = $bindable(""),
    pending,
    onSave,
    onCancel,
  }: {
    content: string;
    pending: boolean;
    onSave: () => Promise<void>;
    onCancel: () => void;
  } = $props();

  let input: HTMLTextAreaElement;
  onMount(() => input.focus());
</script>

<textarea
  bind:this={input}
  class="fr-input resize-y"
  aria-label="Modifier le commentaire"
  rows={3}
  disabled={pending}
  bind:value={content}></textarea>
<div class="fr-mt-1w flex gap-2">
  <button type="button" class="fr-btn fr-btn--sm" disabled={pending} onclick={onSave}>
    Enregistrer
  </button>
  <button
    type="button"
    class="fr-btn fr-btn--secondary fr-btn--sm"
    disabled={pending}
    onclick={onCancel}
  >
    Annuler
  </button>
</div>
