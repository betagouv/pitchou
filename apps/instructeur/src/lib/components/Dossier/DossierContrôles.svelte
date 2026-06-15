<script lang="ts">
  import clsx from "clsx";

  import DecisionAdministrative from "./Contrôles/DecisionAdministrative.svelte";
  import FormDecisionAdministrative from "./Contrôles/FormDecisionAdministrative.svelte";
  import CardDecisionAdministrative from "./Contrôles/CardDecisionAdministrative.svelte";

  import {
    sauvegardeNouvelleDécisionAdministrative,
    supprimerDécisionAdministrative,
  } from "../../actions/décisionAdministrative.ts";
  import { refreshDossierComplet } from "../../actions/dossier.ts";

  import type {
    DossierComplet,
    FrontEndDécisionAdministrative,
    DécisionAdministrativePourTransfer,
  } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossier: DossierComplet;
  };

  let { dossier }: Props = $props();

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

  let décisionAdministrativeEnCréation: DécisionAdministrativePourTransfer | undefined = $state();

  function commencerCréationDécisionAdministrative() {
    décisionAdministrativeEnCréation = {
      dossier: dossier.id,
    };
  }

  async function onValider(decision: DécisionAdministrativePourTransfer) {
    // On failure, the error propagates to the form, which displays it and keeps
    // the form open. We only close and refresh once the save succeeds.
    await sauvegardeNouvelleDécisionAdministrative(decision);
    décisionAdministrativeEnCréation = undefined;
  }

  function annulerCréation() {
    décisionAdministrativeEnCréation = undefined;
  }
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

  {#if décisionAdministrativeEnCréation}
    <CardDecisionAdministrative>
      <h4>Nouvelle décision administrative</h4>
      <FormDecisionAdministrative
        décisionAdministrative={décisionAdministrativeEnCréation}
        {onValider}
        onAnnuler={annulerCréation}
      />
    </CardDecisionAdministrative>
  {:else}
    <button onclick={commencerCréationDécisionAdministrative} class={classes}
      >Rajouter une décision administrative</button
    >
  {/if}
</div>

<style lang="scss">
  h4 {
    margin-top: 0;
    margin-bottom: 1rem;
  }
</style>
