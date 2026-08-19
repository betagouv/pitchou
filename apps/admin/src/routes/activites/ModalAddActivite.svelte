<script lang="ts">
  import Modal from "$lib/components/Modal.svelte";

  type Props = {
    onClose: () => void;
    onCreate: (label: string) => Promise<void>;
  };

  let { onClose, onCreate }: Props = $props();

  let label = $state("");
  let busy = $state(false);
  let submitError = $state<string | null>(null);

  async function submit() {
    const trimmed = label.trim();
    if (!trimmed) return;
    busy = true;
    submitError = null;
    try {
      await onCreate(trimmed);
      onClose();
    } catch (error) {
      submitError = error instanceof Error ? error.message : String(error);
    } finally {
      busy = false;
    }
  }
</script>

<Modal title="Ajouter une activité" {onClose}>
  <form
    id="add-activite-form"
    class="fr-p-3w"
    onsubmit={(event) => {
      event.preventDefault();
      submit();
    }}
  >
    <label class="fr-label" for="add-activite-label">
      Nom de l'activité
      <span class="fr-hint-text">
        L'identifiant technique sera dérivé du nom. Vous pourrez ensuite y rattacher des libellés
        venant de Démarches Numériques.
      </span>
    </label>
    <input id="add-activite-label" class="fr-input fr-mt-1w" type="text" bind:value={label} />
    {#if submitError}
      <p class="fr-mt-2w my-0 text-sm text-red-700">{submitError}</p>
    {/if}
  </form>

  {#snippet footer()}
    <button type="button" class="fr-btn fr-btn--secondary" onclick={onClose}>Annuler</button>
    <button type="submit" form="add-activite-form" class="fr-btn" disabled={busy || !label.trim()}>
      Créer l'activité
    </button>
  {/snippet}
</Modal>
