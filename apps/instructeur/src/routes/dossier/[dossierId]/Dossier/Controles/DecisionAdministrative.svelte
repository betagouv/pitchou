<script lang="ts">
  import Prescriptions from "./Prescriptions.svelte";
  import FormDecisionAdministrative from "./FormDecisionAdministrative.svelte";
  import CardDecisionAdministrative from "./CardDecisionAdministrative.svelte";

  import { formatDateAbsolute } from "$lib/dossier/affichageDossier.ts";
  import { refreshDossierFull } from "$lib/dossier/dossier.ts";
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import { store } from "$lib/state/store.svelte.ts";
  import { labelForDecisionAdministrativeType } from "@pitchou/common/decision-administrative.js";

  import type {
    DecisionAdministrativeForTransfer,
    FrontEndDecisionAdministrative,
  } from "@pitchou/types/API_Pitchou.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";

  type Props = {
    dossierId: Dossier["id"];
    décisionAdministrative: FrontEndDecisionAdministrative;
    deleteDecisionAdministrative: () => Promise<unknown>;
  };

  let {
    dossierId,
    décisionAdministrative: decisionAdministrative = $bindable(),
    deleteDecisionAdministrative,
  }: Props = $props();

  let { numéro, type, date_signature, date_fin_obligations, fichier_url } =
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
      numéro,
      type,
      date_fin_obligations,
      date_signature,
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
    sendEvenement({ type: "modifierDecisionAdministrative" });

    decisionAdministrative = Object.assign(decisionAdministrative, decision);
    editedDecision = undefined;

    refreshDossierFull(dossierId);
  }
</script>

<CardDecisionAdministrative>
  {#if editedDecision}
    <h4>Modifier décision administrative</h4>

    <FormDecisionAdministrative
      decisionAdministrative={editedDecision}
      onValidate={saveModification}
      onCancel={() => (editedDecision = undefined)}
      onDelete={() => (showDeleteConfirmation = true)}
    />
  {:else}
    <h4>
      {type ? labelForDecisionAdministrativeType(type) : "Décision de type inconnu"}
      {numéro || ""} du {formatDateAbsolute(date_signature)}
      <button
        class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-pencil-line"
        onclick={startEditing}
      >
        Modifier
      </button>
    </h4>

    <div class="fr-mb-1w">
      Date de fin des obligations : {date_fin_obligations
        ? formatDateAbsolute(date_fin_obligations)
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

    <Prescriptions {dossierId} décisionAdministrative={decisionAdministrative} />
  {/if}
</CardDecisionAdministrative>

{#if showDeleteConfirmation}
  <div class="confirmation-overlay">
    <div
      class="confirmation"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirmation-suppression-titre"
    >
      <h5 id="confirmation-suppression-titre">Supprimer cette décision administrative ?</h5>
      <p>Cette action est irréversible.</p>
      <div class="buttons">
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

<style lang="scss">
  h4 {
    margin-top: 0;
    margin-bottom: 1rem;
  }

  .confirmation-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background-color: rgba(0, 0, 0, 0.4);
  }

  .confirmation {
    max-width: 32rem;
    padding: 1.5rem 2rem;
    border-radius: 0.5rem;
    background-color: var(--background-default-grey);

    h5 {
      margin-top: 0;
    }

    .buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: flex-end;
    }
  }
</style>
