<script lang="ts">
  import clsx from "clsx";

  import DecisionAdministrative from "./Contrôles/DecisionAdministrative.svelte";
  import ModaleAjouterPièceJointe from "./ModaleAjouterPièceJointe.svelte";

  import { supprimerDécisionAdministrative } from "./Contrôles/décisionAdministrative.ts";
  import { refreshDossierComplet } from "$lib/dossier/dossier.ts";

  import type {
    DossierComplet,
    FrontEndDécisionAdministrative,
  } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossier: DossierComplet;
  };

  let { dossier }: Props = $props();

  const idModaleAjouterDecisionAdministrative = "modale-ajouter-decision-administrative";

  let décisionsAdministratives: FrontEndDécisionAdministrative[] = $derived(
    dossier.décisionsAdministratives || [],
  );

  //$inspect('dossier', dossier)
  //$inspect('décisionsAdministratives', décisionsAdministratives)

  function créerFonctionSupprimer(décisionAdministrative: FrontEndDécisionAdministrative) {
    // Wait for the deletion to complete before refreshing: refreshing first would
    // reload the décision that is still in database, leaving it visible until a
    // manual page reload.
    return async function () {
      await supprimerDécisionAdministrative(décisionAdministrative.id);
      await refreshDossierComplet(dossier.id);
    };
  }

  const phase = $derived(dossier.évènementsPhase.at(-1)?.phase || "Accompagnement amont");

  let classes = $derived(
    clsx([
      "fr-btn",
      "fr-btn--icon-left",
      "fr-icon-add-line",
      décisionsAdministratives.length >= 1 ||
      phase === "Accompagnement amont" ||
      phase === "Étude recevabilité DDEP"
        ? "fr-btn--secondary"
        : undefined,
    ]),
  );
</script>

<div class="row">
  <h2>Décisions administratives</h2>

  {#if décisionsAdministratives.length === 0}
    <p>Il n'y a pas de décisions administrative à contrôler concernant ce dossier</p>
  {:else}
    {#each décisionsAdministratives as décisionAdministrative (décisionAdministrative.id)}
      <DecisionAdministrative
        {décisionAdministrative}
        dossierId={dossier.id}
        supprimerDécisionAdministrative={créerFonctionSupprimer(décisionAdministrative)}
      ></DecisionAdministrative>
    {/each}
  {/if}

  <button
    type="button"
    class={classes}
    aria-controls={idModaleAjouterDecisionAdministrative}
    data-fr-opened="false"
  >
    Rajouter une décision administrative
  </button>
</div>

<ModaleAjouterPièceJointe
  id={idModaleAjouterDecisionAdministrative}
  {dossier}
  typesPiècesJointes={["Décision administrative"]}
  typePièceJointeInitial="Décision administrative"
  afficherChoixType={false}
/>
