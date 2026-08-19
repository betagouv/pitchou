<script lang="ts">
  import Accordion from "./DossierDetailProjet/Accordion.svelte";
  import PorteurDeProjet from "./DossierDetailProjet/PorteurDeProjet.svelte";
  import InformationsProjet from "./DossierDetailProjet/InformationsProjet.svelte";
  import EspecesImpactees from "./DossierDetailProjet/EspecesImpactees.svelte";
  import PiecesJointes from "./DossierDetailProjet/PiecesJointes.svelte";
  import { especesCounts, especesCountsLabel } from "./DossierDetailProjet/especes.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { DescriptionMenacesEspeces } from "@pitchou/types/especes.d.ts";

  type Props = {
    dossier: DossierFull;
    especesImpactees: Promise<DescriptionMenacesEspeces> | undefined;
  };

  let { dossier, especesImpactees }: Props = $props();
</script>

<div class="flex flex-col gap-4">
  <Accordion id="accordion-porteur-de-projet" title="Porteur de projet">
    <PorteurDeProjet {dossier} />
  </Accordion>

  <Accordion id="accordion-informations-projet" title="Informations du projet">
    <InformationsProjet {dossier} />
  </Accordion>

  <Accordion id="accordion-especes-impactees" title="Espèces impactées">
    {#snippet badges()}
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
      <span class="fr-badge">{dossier.piecesJointesPetitionnaires.length}</span>
    {/snippet}
    <PiecesJointes {dossier} />
  </Accordion>
</div>
