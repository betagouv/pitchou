<script lang="ts">
  import DownloadButton from "$lib/components/DownloadButton.svelte";
  import EspecesProtegeesGroupedByImpact from "$lib/components/EspecesProtegeesGroupedByImpact.svelte";
  import { loadActivitesMethodesMoyensDePoursuite } from "$lib/especes/activitesMethodesMoyensDePoursuite.ts";
  import Loader from "@pitchou/ui/Loader.svelte";
  import { sendEvenement } from "$lib/shared/aarri.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { DescriptionMenacesEspeces } from "@pitchou/types/especes.d.ts";

  type Props = {
    dossier: DossierFull;
    especesImpactees: Promise<DescriptionMenacesEspeces> | undefined;
  };

  let { dossier, especesImpactees }: Props = $props();

  async function makeFileContentBlob() {
    const especes = dossier.especesImpactees;
    if (!especes) {
      throw new Error("Aucun fichier espèces impactées à télécharger");
    }

    sendEvenement({
      type: "téléchargerListeÉspècesImpactées",
      details: { dossierId: dossier.id },
    });

    const response = await fetch(especes.url);
    return response.blob();
  }

  function makeFilename() {
    return dossier.especesImpactees?.name || "fichier";
  }

  const referentielsPromise = loadActivitesMethodesMoyensDePoursuite();
</script>

{#if dossier.especesImpactees && especesImpactees}
  <div class="fr-mb-2w flex justify-end">
    <!-- In Svelte, a child component does not have access to the style classes defined in the parent component in which it is called. So we use an inline style. -->
    <DownloadButton
      {makeFileContentBlob}
      {makeFilename}
      style="width: 15rem;"
      classname="fr-btn fr-btn--secondary"
      label="Télécharger le fichier des espèces impactées"
    />
  </div>
  {#await Promise.all([especesImpactees, referentielsPromise])}
    <Loader></Loader>
  {:then [especesImpactees, { identifiantPitchouVersActivitéEtImpactsQuantifiés: identifiantPitchouVersActiviteEtImpactsQuantifies }]}
    <EspecesProtegeesGroupedByImpact
      espècesImpactées={especesImpactees}
      identifiantPitchouVersActivitéEtImpactsQuantifiés={identifiantPitchouVersActiviteEtImpactsQuantifies}
    />
  {:catch}
    <p>Le fichier des espèces impactées n'a pas pu être lu.</p>
  {/await}
{:else}
  <p>Aucune données sur les espèces impactées n'a été fournie par le pétitionnaire</p>
{/if}
