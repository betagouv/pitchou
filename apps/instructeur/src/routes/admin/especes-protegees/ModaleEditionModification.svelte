<script lang="ts">
  import type {
    ModificationEspeceAdmin,
    PatchModificationEspece,
  } from "$front/actions/adminEspeces.ts";
  import { saveModificationEspece, deleteModificationEspece } from "$front/actions/adminEspeces.ts";

  import { CLASSIFICATIONS, displayedNom } from "./adminModificationsList.ts";
  import Modale from "./Modale.svelte";
  import ChampClassification from "./ChampClassification.svelte";
  import ChampNoms from "./ChampNoms.svelte";
  import ChampStatuts from "./ChampStatuts.svelte";
  import ChampOuiNon from "./ChampOuiNon.svelte";

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

  const titre = $derived(
    creation && !created
      ? "Ajouter une espèce hors référentiel"
      : `Modifier ${displayedNom(current)} (CD_REF ${current.cd_ref})`,
  );

  // A net-new (off-reference) species has no TAXREF/BDC row: nothing to inherit from. The
  // reference always has a non-null classification, so its absence is the reliable signal.
  const hasReference = $derived(current.reference_classification !== null);

  function formatDate(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? iso
      : date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  }

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
    <span class="confirm-label">Supprimer cette modification&nbsp;?</span>
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

<Modale title={titre} {onClose} footer={created ? deleteFooter : undefined}>
  <div class="body">
    {#if creation && !created}
      <div class="creation">
        <div class="fr-input-group">
          <label class="fr-label" for="creation-cd-ref">CD_REF</label>
          <input id="creation-cd-ref" class="fr-input" type="text" bind:value={draftCdRef} />
        </div>
        <div class="fr-input-group">
          <label class="fr-label" for="creation-classification">Classification</label>
          <select id="creation-classification" class="fr-select" bind:value={draftClassification}>
            {#each CLASSIFICATIONS as classification}
              <option value={classification}>{classification}</option>
            {/each}
          </select>
        </div>
        <p class="hint">
          Le CD_REF et la classification sont requis à la création. Les autres champs seront
          modifiables ensuite, un par un.
        </p>
        <div class="creation-actions">
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
      <div class="fields">
        <ChampClassification
          value={current.classification}
          referenceClassification={current.reference_classification}
          {hasReference}
          {saving}
          onSave={(v) => saveField({ classification: v })}
        />
        <ChampNoms
          label="Noms scientifiques"
          source="TAXREF"
          inheritId="inherit-noms-scientifiques"
          values={current.noms_scientifiques}
          referenceValues={current.reference_noms_scientifiques}
          {hasReference}
          {saving}
          onSave={(v) => saveField({ noms_scientifiques: v })}
        />
        <ChampNoms
          label="Noms vernaculaires"
          source="TAXREF"
          inheritId="inherit-noms-vernaculaires"
          values={current.noms_vernaculaires}
          referenceValues={current.reference_noms_vernaculaires}
          {hasReference}
          {saving}
          onSave={(v) => saveField({ noms_vernaculaires: v })}
        />
        <ChampStatuts
          values={current.cd_type_statuts}
          referenceValues={current.reference_cd_type_statuts}
          {hasReference}
          {saving}
          onSave={(v) => saveField({ cd_type_statuts: v })}
        />
        <ChampOuiNon
          label="Espèce ministérielle"
          toggleLabel="Espèce ministérielle"
          value={current.espece_ministerielle ?? false}
          {saving}
          onSave={(v) => saveField({ espece_ministerielle: v })}
        />
        <ChampOuiNon
          label="Espèce CNPN"
          toggleLabel="Espèce CNPN"
          value={current.espece_cnpn ?? false}
          {saving}
          onSave={(v) => saveField({ espece_cnpn: v })}
        />
        <ChampOuiNon
          label="Exclue de la liste publique"
          toggleLabel="Exclure cette espèce"
          value={current.exclu}
          {saving}
          onSave={(v) => saveField({ exclu: v })}
        />

        {#if current.modifie_par}
          <p class="audit">
            Dernière modification par {current.modifie_par}{current.updated_at
              ? ` le ${formatDate(current.updated_at)}`
              : ""}
          </p>
        {/if}
      </div>
    {/if}

    {#if error}
      <div class="fr-alert fr-alert--error fr-alert--sm" role="alert">
        <p>{error}</p>
      </div>
    {/if}
  </div>
</Modale>

<style lang="scss">
  .body {
    padding: 1rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .fields {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    // The first field sits right under the header divider, so drop its own top border.
    :global(.field:first-child) {
      border-top: 0;
      padding-top: 0;
    }
  }

  .creation {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .creation-actions {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .hint {
    color: var(--text-mention-grey);
    font-style: italic;
    margin: 0;
  }

  .audit {
    margin: 0;
    color: var(--text-mention-grey);
    font-size: 0.875rem;
  }

  .confirm-label {
    font-weight: 700;
  }
</style>
