<script lang="ts">
  import { store } from "$lib/state/store.svelte.ts";
  import { setContext } from "svelte";
  import { boundReviewChanges, dossierReviewContext } from "$lib/dossier/notification/snapshot.ts";
  import { refreshDossierFull } from "$lib/dossier/dossier.ts";
  import Accordion from "./DossierDetailProjet/Accordion.svelte";
  import PorteurDeProjet from "./DossierDetailProjet/PorteurDeProjet.svelte";
  import InformationsProjet from "./DossierDetailProjet/InformationsProjet.svelte";
  import EspecesImpactees from "./DossierDetailProjet/EspecesImpactees.svelte";
  import PiecesJointes from "./DossierDetailProjet/PiecesJointes.svelte";
  import { especesCounts, especesCountsLabel } from "./DossierDetailProjet/especes.ts";
  import { nouvellesModifications } from "./DossierDetailProjet/modifications.ts";
  import { readOnlyMode } from "./readOnly.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { AnomalieFichierEspeces } from "@pitchou/types/especesImpact.d.ts";
  import type Notification from "@pitchou/types/database/public/Notification.ts";

  type Props = {
    dossier: DossierFull;
    anomalies: Promise<AnomalieFichierEspeces[]> | undefined;
    notification?: Pick<Notification, "viewed" | "updated_at" | "viewed_at">;
  };

  let { dossier, anomalies }: Props = $props();

  const readOnly = readOnlyMode();
  setContext(dossierReviewContext, () => dossier);
  const pending = $derived(
    readOnly.current ? undefined : store.notificationByDossier.get(dossier.id),
  );
  const boundChanges = $derived(readOnly.current ? [] : boundReviewChanges(dossier, pending));
  const needsRefresh = $derived(
    !readOnly.current &&
      pending?.changes.some((change) =>
        change.revisions.some((id) => !boundChanges.some((bound) => bound.revisions.includes(id))),
      ),
  );
  let refreshing = $state(false);
  async function refresh() {
    refreshing = true;
    try {
      await refreshDossierFull(dossier.id);
    } catch {
      store.errors.add({ message: "Impossible d'actualiser le dossier. Réessayez." });
    } finally {
      refreshing = false;
    }
  }

  const modifications = $derived(nouvellesModifications(boundChanges));
</script>

{#snippet nouveau()}
  <span class="fr-badge fr-badge--sm fr-badge--no-icon" style="background: #ffe7a3; color: #5c4813"
    >Nouvelles modifications</span
  >
{/snippet}

<div class="flex flex-col gap-4">
  {#if needsRefresh}
    <div role="status">
      Des modifications concernent une autre version du dossier.
      <button
        type="button"
        class="fr-btn fr-btn--secondary fr-btn--sm"
        disabled={refreshing}
        onclick={refresh}>Actualiser les modifications</button
      >
    </div>
  {/if}
  <Accordion id="accordion-porteur-de-projet" title="Porteur de projet">
    {#snippet badges()}
      {#if modifications.porteurDates.size > 0}{@render nouveau()}{/if}
    {/snippet}
    <PorteurDeProjet {dossier} modifiedFields={modifications.porteurDates} />
  </Accordion>

  <Accordion id="accordion-informations-projet" title="Informations du projet">
    {#snippet badges()}
      {#if modifications.fieldDates.size > 0}{@render nouveau()}{/if}
    {/snippet}
    <InformationsProjet {dossier} modifiedFields={modifications.fieldDates} />
  </Accordion>

  <Accordion id="accordion-especes-impactees" title="Espèces impactées">
    {#snippet badges()}
      <span class="fr-badge"
        >{especesCountsLabel(especesCounts(dossier.especesImpactees.impacts))}</span
      >
      {#if modifications.especes}{@render nouveau()}{/if}
    {/snippet}
    <EspecesImpactees {dossier} {anomalies} change={modifications.especes} />
  </Accordion>

  <Accordion id="accordion-pieces-jointes-formulaire" title="Pièces jointes">
    {#snippet badges()}
      <span class="fr-badge">{dossier.piecesJointesPetitionnaires.length}</span>
      {#if modifications.piecesJointes.length}{@render nouveau()}{/if}
    {/snippet}
    <PiecesJointes {dossier} changes={modifications.piecesJointes} />
  </Accordion>
</div>
