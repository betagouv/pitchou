<script lang="ts">
  import Prescriptions from "./Prescriptions.svelte";
  import FormDecisionAdministrative from "./FormDecisionAdministrative.svelte";
  import CardDecisionAdministrative from "./CardDecisionAdministrative.svelte";

  import { formatDateAbsolue } from "../../../affichageDossier.ts";
  import { refreshDossierComplet } from "../../../actions/dossier.ts";
  import { envoyerÉvènement } from "../../../actions/aarri.ts";
  import { store } from "../../../store.svelte.ts";

  import type {
    DécisionAdministrativePourTransfer,
    FrontEndDécisionAdministrative,
  } from "../../../../types/API_Pitchou.ts";
  import type Dossier from "../../../../types/database/public/Dossier.ts";

  type Props = {
    dossierId: Dossier["id"];
    décisionAdministrative: FrontEndDécisionAdministrative;
    supprimerDécisionAdministrative: () => Promise<unknown>;
  };

  let {
    dossierId,
    décisionAdministrative = $bindable(),
    supprimerDécisionAdministrative,
  }: Props = $props();

  let { numéro, type, date_signature, date_fin_obligations, fichier_url } =
    $derived(décisionAdministrative);

  const NON_RENSEIGNÉ = "(non renseigné)";

  let decisionEnModification: DécisionAdministrativePourTransfer | undefined = $state();

  // Deletion is irreversible, so we ask for confirmation before calling it.
  let showDeleteConfirmation = $state(false);
  let deleteInProgress = $state(false);

  async function confirmDelete() {
    deleteInProgress = true;
    try {
      await supprimerDécisionAdministrative();
      showDeleteConfirmation = false;
    } finally {
      deleteInProgress = false;
    }
  }

  function commencerModification() {
    const { id } = décisionAdministrative;
    decisionEnModification = {
      id,
      dossier: dossierId,
      numéro,
      type,
      date_fin_obligations,
      date_signature,
    };
  }

  async function sauvegarderModification(decision: DécisionAdministrativePourTransfer) {
    const modifierDécisionAdministrativeDansDossier =
      store.capabilities.modifierDécisionAdministrativeDansDossier;

    if (!modifierDécisionAdministrativeDansDossier) {
      throw new Error(`Pas les droits suffisants pour modifier une décision administrative`);
    }

    // On failure, the error propagates to the form, which displays it and keeps
    // the form open. We only update the view once the save succeeds.
    await modifierDécisionAdministrativeDansDossier(decision);
    envoyerÉvènement({ type: "modifierDécisionAdministrative" });

    décisionAdministrative = Object.assign(décisionAdministrative, decision);
    decisionEnModification = undefined;

    refreshDossierComplet(dossierId);
  }
</script>

<CardDecisionAdministrative>
  {#if decisionEnModification}
    <h4>Modifier décision administrative</h4>

    <FormDecisionAdministrative
      décisionAdministrative={decisionEnModification}
      onValider={sauvegarderModification}
      onAnnuler={() => (decisionEnModification = undefined)}
      onSupprimer={() => (showDeleteConfirmation = true)}
    />
  {:else}
    <h4>
      {type || "Décision de type inconnu"}
      {numéro || ""} du {formatDateAbsolue(date_signature)}
      <button
        class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-pencil-line"
        onclick={commencerModification}
      >
        Modifier
      </button>
    </h4>

    <div class="fr-mb-1w">
      Date de fin des obligations : {date_fin_obligations
        ? formatDateAbsolue(date_fin_obligations)
        : NON_RENSEIGNÉ}
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

    <Prescriptions {dossierId} {décisionAdministrative} />
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
