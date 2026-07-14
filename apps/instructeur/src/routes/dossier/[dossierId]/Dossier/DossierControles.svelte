<script lang="ts">
  import clsx from "clsx";

  import DecisionAdministrative from "./Controles/DecisionAdministrative.svelte";
  import ModaleAjouterPieceJointe from "./ModaleAjouterPieceJointe.svelte";

  import { supprimerDecisionAdministrative } from "./Controles/decisionAdministrative.ts";
  import { refreshDossierComplet } from "$lib/dossier/dossier.ts";
  import { envoyerEvenement } from "$lib/shared/aarri.ts";

  import type {
    DossierComplet,
    FrontEndDecisionAdministrative,
  } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossier: DossierComplet;
  };

  let { dossier }: Props = $props();

  const idModaleAjouterDecisionAdministrative = "modale-ajouter-decision-administrative";

  let decisionsAdministratives: FrontEndDecisionAdministrative[] = $derived(
    dossier.décisionsAdministratives || [],
  );

  //$inspect('dossier', dossier)
  //$inspect('décisionsAdministratives', décisionsAdministratives)

  function creerFonctionSupprimer(decisionAdministrative: FrontEndDecisionAdministrative) {
    // Wait for the deletion to complete before refreshing: refreshing first would
    // reload the décision that is still in database, leaving it visible until a
    // manual page reload.
    return async function () {
      await supprimerDecisionAdministrative(decisionAdministrative.id);
      await refreshDossierComplet(dossier.id);
    };
  }

  const phase = $derived(dossier.évènementsPhase.at(-1)?.phase || "Accompagnement amont");

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
        décisionAdministrative={decisionAdministrative}
        dossierId={dossier.id}
        supprimerDecisionAdministrative={creerFonctionSupprimer(decisionAdministrative)}
      ></DecisionAdministrative>
    {/each}
  {/if}

  <button
    type="button"
    class={classes}
    aria-controls={idModaleAjouterDecisionAdministrative}
    data-fr-opened="false"
    onclick={() =>
      envoyerEvenement({
        type: "ouvrirModaleAjouterPieceJointe",
        détails: { dossierId: dossier.id, source: "ongletControles" },
      })}
  >
    Rajouter une décision administrative
  </button>
</div>

<ModaleAjouterPieceJointe
  id={idModaleAjouterDecisionAdministrative}
  {dossier}
  typesPiècesJointes={["Décision administrative"]}
  typePièceJointeInitial="Décision administrative"
  afficherChoixType={false}
  source="ongletControles"
/>
