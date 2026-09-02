<script lang="ts">
  import Select from "@pitchou/ui/Select.svelte";

  import type {
    ModificationEspeceAdmin,
    PatchModificationEspece,
  } from "$lib/actions/adminEspeces.ts";
  import { saveModificationEspece, deleteModificationEspece } from "$lib/actions/adminEspeces.ts";

  import { CLASSIFICATIONS, displayedNom } from "../adminModificationsList.ts";
  import Modal from "$lib/components/Modal.svelte";
  import ModificationFields from "./ModificationFields.svelte";

  type Props = {
    seed: ModificationEspeceAdmin;
    /** Net-new (off-reference): the cd_ref and a classification must be set before per-field edit. */
    creation: boolean;
    onSaved: () => Promise<void> | void;
    onClose: () => void;
  };

  let { seed, creation, onSaved, onClose }: Props = $props();

  // The modal owns a working copy: each per-field save patches it locally and refreshes the
  // list behind via onSaved(), so the modal stays correct without depending on the parent.
  // svelte-ignore state_referenced_locally
  let current = $state<ModificationEspeceAdmin>({ ...seed });
  // svelte-ignore state_referenced_locally
  let created = $state(!creation);

  let confirmingDelete = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);

  let draftCdRef = $state("");
  let draftClassification = $state<string>(CLASSIFICATIONS[0]);

  const classificationOptions = CLASSIFICATIONS.map((classification) => ({
    value: classification as string,
    label: classification,
  }));

  const titre = $derived(
    creation && !created
      ? "Ajouter une espèce hors référentiel"
      : `Modifier ${displayedNom(current)} (CD_REF ${current.cd_ref})`,
  );

  // A net-new (off-reference) species has no TAXREF/BDC row: nothing to inherit from. The
  // reference always has a non-null classification, so its absence is the reliable signal.
  const hasReference = $derived(current.reference_classification !== null);

  /** Saves one field's patch; returns true on success so the field can leave edit mode. */
  async function saveField(patch: Partial<PatchModificationEspece>): Promise<boolean> {
    error = null;
    saving = true;
    try {
      await saveModificationEspece(current.cd_ref, patch);
      current = { ...current, ...patch };
      await onSaved();
      return true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      return false;
    } finally {
      saving = false;
    }
  }

  async function createFiche() {
    error = null;
    const cd_ref = draftCdRef.trim();
    if (!cd_ref) {
      error = "Le CD_REF est obligatoire.";
      return;
    }
    if (!draftClassification) {
      error = "Choisissez une classification.";
      return;
    }
    saving = true;
    try {
      // Always set a classification on creation: a net-new row with a NULL classification
      // would surface in the public view and break the list reader.
      await saveModificationEspece(cd_ref, { classification: draftClassification });
      current = { ...current, cd_ref, classification: draftClassification };
      created = true;
      await onSaved();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      saving = false;
    }
  }

  async function doDelete() {
    error = null;
    saving = true;
    try {
      await deleteModificationEspece(current.cd_ref);
      await onSaved();
      onClose();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      saving = false;
    }
  }
</script>

{#snippet deleteFooter()}
  {#if confirmingDelete}
    <span class="fr-text--bold">Supprimer cette modification&nbsp;?</span>
    <button type="button" class="fr-btn fr-btn--sm" disabled={saving} onclick={doDelete}>
      Confirmer la suppression
    </button>
    <button
      type="button"
      class="fr-btn fr-btn--sm fr-btn--secondary"
      disabled={saving}
      onclick={() => (confirmingDelete = false)}
    >
      Annuler
    </button>
  {:else}
    <button
      type="button"
      class="fr-btn fr-btn--sm fr-btn--secondary fr-icon-delete-line fr-btn--icon-left"
      onclick={() => (confirmingDelete = true)}
    >
      Supprimer la modification
    </button>
  {/if}
{/snippet}

<Modal title={titre} {onClose} footer={created ? deleteFooter : undefined}>
  <div class="fr-py-2w fr-px-3w flex flex-col gap-3">
    {#if creation && !created}
      <div class="flex flex-col gap-4">
        <div class="fr-input-group">
          <label class="fr-label" for="creation-cd-ref">CD_REF</label>
          <input id="creation-cd-ref" class="fr-input" type="text" bind:value={draftCdRef} />
        </div>
        <div class="fr-input-group">
          <label class="fr-label" for="creation-classification">Classification</label>
          <Select
            id="creation-classification"
            class="fr-mt-1w"
            options={classificationOptions}
            bind:value={draftClassification}
          />
        </div>
        <p class="text-[color:var(--text-mention-grey)] italic m-0">
          Le CD_REF et la classification sont requis à la création. Les autres champs seront
          modifiables ensuite, un par un.
        </p>
        <div class="flex flex-row gap-2 flex-wrap">
          <button type="button" class="fr-btn" disabled={saving} onclick={createFiche}>
            Créer la fiche
          </button>
          <button
            type="button"
            class="fr-btn fr-btn--secondary"
            disabled={saving}
            onclick={onClose}
          >
            Annuler
          </button>
        </div>
      </div>
    {:else}
      <ModificationFields {current} {hasReference} {saving} onSave={saveField} />
    {/if}

    {#if error}
      <div class="fr-alert fr-alert--error fr-alert--sm" role="alert">
        <p>{error}</p>
      </div>
    {/if}
  </div>
</Modal>
