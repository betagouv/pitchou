<script lang="ts">
  import Select from "@pitchou/ui/Select.svelte";
  import type { SelectOption } from "@pitchou/ui/Select/options.ts";
  import Modal from "$lib/components/Modal.svelte";

  type Props = {
    groupeOptions: SelectOption<string>[];
    onClose: () => void;
    onCreate: (label: string, groupeCode: string) => Promise<void>;
  };

  let { groupeOptions, onClose, onCreate }: Props = $props();

  let label = $state("");
  let groupeCode = $state("");
  let busy = $state(false);
  let submitError = $state<string | null>(null);

  async function submit() {
    const trimmed = label.trim();
    if (!trimmed || !groupeCode) return;
    busy = true;
    submitError = null;
    try {
      await onCreate(trimmed, groupeCode);
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

    <label class="fr-label fr-mt-2w" for="add-activite-groupe">Groupe thématique</label>
    <Select
      id="add-activite-groupe"
      class="fr-mt-1w"
      placeholder="Sélectionner un groupe"
      options={groupeOptions}
      bind:value={groupeCode}
    />

    {#if submitError}
      <p class="fr-mt-2w my-0 text-sm text-red-700">{submitError}</p>
    {/if}
  </form>

  {#snippet footer()}
    <button type="button" class="fr-btn fr-btn--secondary" onclick={onClose}>Annuler</button>
    <button
      type="submit"
      form="add-activite-form"
      class="fr-btn"
      disabled={busy || !label.trim() || !groupeCode}
    >
      Créer l'activité
    </button>
  {/snippet}
</Modal>
