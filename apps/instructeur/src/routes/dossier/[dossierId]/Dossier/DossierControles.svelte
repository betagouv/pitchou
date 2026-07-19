<script lang="ts">
  import clsx from "clsx";

  import DecisionAdministrative from "./Controles/DecisionAdministrative.svelte";
  import ModalAddPieceJointe from "./ModalAddPieceJointe.svelte";

  import { deleteDecisionAdministrative } from "./Controles/decisionAdministrative.ts";
  import { refreshDossierFull } from "$lib/dossier/dossier.ts";
  import { sendEvenement } from "$lib/shared/aarri.ts";

  import type { DossierFull, FrontEndDecisionAdministrative } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossier: DossierFull;
  };

  let { dossier }: Props = $props();

  const idModalAddDecisionAdministrative = "modale-ajouter-decision-administrative";

  let decisionsAdministratives: FrontEndDecisionAdministrative[] = $derived(
    dossier.decisionsAdministratives || [],
  );

  //$inspect('dossier', dossier)
  //$inspect('décisionsAdministratives', décisionsAdministratives)

  function createDeleteFunction(decisionAdministrative: FrontEndDecisionAdministrative) {
    // Wait for the deletion to complete before refreshing: refreshing first would
    // reload the décision that is still in database, leaving it visible until a
    // manual page reload.
    return async function () {
      await deleteDecisionAdministrative(decisionAdministrative.id);
      await refreshDossierFull(dossier.id);
    };
  }

  const phase = $derived(dossier.evenementsPhase.at(-1)?.phase || "Accompagnement amont");

  let classes = $derived(
    clsx([
      "fr-btn",
      "fr-btn--icon-left",
      "fr-icon-add-line",
      decisionsAdministratives.length >= 1 ||
      phase === "Accompagnement amont" ||
      phase === "Étude recevabilité DDEP"
        ? "fr-btn--secondary"
        : undefined,
    ]),
  );
</script>

<div class="row">
  <h2>Décisions administratives</h2>

  {#if decisionsAdministratives.length === 0}
    <p>Il n'y a pas de décisions administrative à contrôler concernant ce dossier</p>
  {:else}
    {#each decisionsAdministratives as decisionAdministrative (decisionAdministrative.id)}
      <DecisionAdministrative
        {decisionAdministrative}
        dossierId={dossier.id}
        deleteDecisionAdministrative={createDeleteFunction(decisionAdministrative)}
      ></DecisionAdministrative>
    {/each}
  {/if}

  <button
    type="button"
    class={classes}
    aria-controls={idModalAddDecisionAdministrative}
    data-fr-opened="false"
    onclick={() =>
      sendEvenement({
        type: "ouvrirModaleAjouterPieceJointe",
        détails: { dossierId: dossier.id, source: "ongletControles" },
      })}
  >
    Rajouter une décision administrative
  </button>
</div>

<ModalAddPieceJointe
  id={idModalAddDecisionAdministrative}
  {dossier}
  typesPiecesJointes={["Décision administrative"]}
  typePieceJointeInitial="Décision administrative"
  showTypeChoice={false}
  source="ongletControles"
/>
