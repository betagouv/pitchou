<script lang="ts">
  import { untrack } from "svelte";
  import { store } from "$lib/state/store.svelte.ts";
  import Accordion from "./DossierDetailProjet/Accordion.svelte";
  import PorteurDeProjet from "./DossierDetailProjet/PorteurDeProjet.svelte";
  import InformationsProjet from "./DossierDetailProjet/InformationsProjet.svelte";
  import EspecesImpactees from "./DossierDetailProjet/EspecesImpactees.svelte";
  import PiecesJointes from "./DossierDetailProjet/PiecesJointes.svelte";
  import { especesCounts, especesCountsLabel } from "./DossierDetailProjet/especes.ts";
  import { nouvellesModifications } from "./DossierDetailProjet/modifications.ts";

  import type { DossierAction } from "@pitchou/types/capabilities.ts";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { DescriptionMenacesEspeces } from "@pitchou/types/especes.d.ts";
  import type Notification from "@pitchou/types/database/public/Notification.ts";

  type Props = {
    dossier: DossierFull;
    especesImpactees: Promise<DescriptionMenacesEspeces> | undefined;
    notification?: Pick<Notification, "viewed" | "updated_at" | "viewed_at">;
  };

  let { dossier, especesImpactees, notification }: Props = $props();

  // Snapshot of the last read date at mount: staying on the page marks the
  // dossier read after a few seconds, and the badges must not vanish mid-visit.
  const lastReadAt = untrack(() =>
    notification?.viewed_at ? new Date(notification.viewed_at) : null,
  );

  let actions: DossierAction[] = $state([]);
  $effect(() => {
    void store.capabilities
      .listerActionsDossier?.(dossier.id)
      .then((list) => (actions = list))
      // The badges are a bonus: without the historique the tab still works.
      .catch(() => (actions = []));
  });

  const modifications = $derived(nouvellesModifications(actions, lastReadAt));
</script>

{#snippet nouveau()}
  <span class="fr-badge fr-badge--sm fr-badge--new">Nouvelles modifications</span>
{/snippet}

<div class="flex flex-col gap-4">
  <Accordion id="accordion-porteur-de-projet" title="Porteur de projet">
    {#snippet badges()}
      {#if modifications.porteurDates.size > 0}{@render nouveau()}{/if}
    {/snippet}
    <PorteurDeProjet {dossier} />
  </Accordion>

  <Accordion id="accordion-informations-projet" title="Informations du projet">
    {#snippet badges()}
      {#if modifications.fieldDates.size > 0}{@render nouveau()}{/if}
    {/snippet}
    <InformationsProjet {dossier} modifiedFields={modifications.fieldDates} />
  </Accordion>

  <Accordion id="accordion-especes-impactees" title="Espèces impactées">
    {#snippet badges()}
      {#if modifications.especes}{@render nouveau()}{/if}
      {#if especesImpactees}
        {#await especesImpactees then description}
          <span class="fr-badge">{especesCountsLabel(especesCounts(description))}</span>
        {:catch}
          <!-- Unreadable file: no count in the band, the panel explains. -->
        {/await}
      {:else}
        <span class="fr-badge">0</span>
      {/if}
    {/snippet}
    <EspecesImpactees {dossier} {especesImpactees} />
  </Accordion>

  <Accordion id="accordion-pieces-jointes-formulaire" title="Pièces jointes">
    {#snippet badges()}
      {#if modifications.piecesJointes}{@render nouveau()}{/if}
      <span class="fr-badge">{dossier.piecesJointesPetitionnaires.length}</span>
    {/snippet}
    <PiecesJointes {dossier} />
  </Accordion>
</div>
