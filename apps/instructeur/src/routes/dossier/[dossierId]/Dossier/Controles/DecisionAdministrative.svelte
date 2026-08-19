<script lang="ts">
  import Prescriptions from "./Prescriptions.svelte";
  import FormDecisionAdministrative from "./FormDecisionAdministrative.svelte";
  import CardDecisionAdministrative from "./CardDecisionAdministrative.svelte";

  import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import { refreshDossierFull } from "$lib/dossier/dossier.ts";
  import { store } from "$lib/state/store.svelte.ts";
  import { labelForDecisionAdministrativeType } from "@pitchou/common/decisionAdministrative.js";

  import type {
    DecisionAdministrativeForTransfer,
    FrontEndDecisionAdministrative,
  } from "@pitchou/types/API_Pitchou.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";

  type Props = {
    dossierId: Dossier["id"];
    decisionAdministrative: FrontEndDecisionAdministrative;
    deleteDecisionAdministrative: () => Promise<unknown>;
  };

  let {
    dossierId,
    decisionAdministrative = $bindable(),
    deleteDecisionAdministrative,
  }: Props = $props();

  let { number, type, signature_date, obligations_end_date, fichier_url } =
    $derived(decisionAdministrative);

  const NOT_PROVIDED = "(non renseigné)";

  let editedDecision: DecisionAdministrativeForTransfer | undefined = $state();

  // Deletion is irreversible, so we ask for confirmation before calling it.
  let showDeleteConfirmation = $state(false);
  let deleteInProgress = $state(false);

  async function confirmDelete() {
    deleteInProgress = true;
    try {
      await deleteDecisionAdministrative();
      showDeleteConfirmation = false;
    } finally {
      deleteInProgress = false;
    }
  }

  function startEditing() {
    const { id } = decisionAdministrative;
    editedDecision = {
      id,
      dossier: dossierId,
      number,
      type,
      obligations_end_date,
      signature_date,
    };
  }

  async function saveModification(decision: DecisionAdministrativeForTransfer) {
    const modifierDecisionAdministrativeDansDossier =
      store.capabilities.modifierDecisionAdministrativeDansDossier;

    if (!modifierDecisionAdministrativeDansDossier) {
      throw new Error(`Pas les droits suffisants pour modifier une décision administrative`);
    }

    // On failure, the error propagates to the form, which displays it and keeps
    // the form open. We only update the view once the save succeeds.
    await modifierDecisionAdministrativeDansDossier(decision);

    decisionAdministrative = Object.assign(decisionAdministrative, decision);
    editedDecision = undefined;

    refreshDossierFull(dossierId);
  }
</script>

<CardDecisionAdministrative>
  {#if editedDecision}
    <h4 class="fr-mt-0 fr-mb-2w">Modifier décision administrative</h4>

    <FormDecisionAdministrative
      decisionAdministrative={editedDecision}
      onValidate={saveModification}
      onCancel={() => (editedDecision = undefined)}
      onDelete={() => (showDeleteConfirmation = true)}
    />
  {:else}
    <h4 class="fr-mt-0 fr-mb-2w">
      {type ? labelForDecisionAdministrativeType(type) : "Décision de type inconnu"}
      {number || ""} du {formatDateAbsolute(signature_date)}
      <button
        class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-pencil-line"
        onclick={startEditing}
      >
        Modifier
      </button>
    </h4>

    <div class="fr-mb-1w">
      Date de fin des obligations : {obligations_end_date
        ? formatDateAbsolute(obligations_end_date)
        : NOT_PROVIDED}
    </div>

    <div class="fr-mb-2w">
      {#if fichier_url}
        <a class="fr-btn fr-btn--secondary fr-btn--sm" href={fichier_url} data-sveltekit-reload>
          Télécharger le fichier de l'arrếté
        </a>
      {:else}
        (fichier manquant)
      {/if}
    </div>

    <Prescriptions {dossierId} {decisionAdministrative} />
  {/if}
</CardDecisionAdministrative>

{#if showDeleteConfirmation}
  <div class="fixed inset-0 z-[1000] flex items-center justify-center fr-p-2w bg-[rgba(0,0,0,0.4)]">
    <div
      class="max-w-[32rem] fr-py-3w fr-px-4w rounded-[0.5rem] bg-[var(--background-default-grey)]"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirmation-suppression-titre"
    >
      <h5 id="confirmation-suppression-titre" class="fr-mt-0">
        Supprimer cette décision administrative ?
      </h5>
      <p>Cette action est irréversible.</p>
      <div class="flex flex-wrap gap-4 justify-end">
        <button
          type="button"
          class="fr-btn fr-btn--secondary"
          disabled={deleteInProgress}
          onclick={() => (showDeleteConfirmation = false)}
        >
          Annuler
        </button>
        <button type="button" class="fr-btn" disabled={deleteInProgress} onclick={confirmDelete}>
          {deleteInProgress ? "Suppression en cours…" : "Confirmer la suppression"}
        </button>
      </div>
    </div>
  </div>
{/if}
