<script lang="ts">
  import DownloadButton from "$lib/components/DownloadButton.svelte";
  import EspecesProtegeesGroupedByImpact from "$lib/components/EspecesProtegeesGroupedByImpact.svelte";
  import { loadActivitesMethodesMoyensDePoursuite } from "$lib/especes/activitesMethodesMoyensDePoursuite.ts";
  import Loader from "@pitchou/ui/Loader.svelte";
  import { sendEvenement } from "$lib/shared/aarri.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { ResultatImportFichierEspeces } from "@pitchou/common/impact_espece/parseFichierEspecesImpactees.ts";

  type Props = {
    dossier: DossierFull;
    especesImpactees: Promise<ResultatImportFichierEspeces> | undefined;
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
      label="Télécharger le fichier original"
    />
  </div>
  {#await Promise.all([especesImpactees, referentielsPromise])}
    <Loader></Loader>
  {:then [{ impactEspece, anomalies }, { identifiantPitchouVersActivitéEtImpactsQuantifiés: identifiantPitchouVersActiviteEtImpactsQuantifies }]}
    {#if anomalies.length >= 1}
      <div class="fr-alert fr-alert--warning fr-mb-2w" role="status">
        <h3 class="fr-alert__title">
          {anomalies.length}
          {anomalies.length > 1 ? "lignes du fichier n’ont" : "ligne du fichier n’a"} pas pu être lue{anomalies.length >
          1
            ? "s"
            : ""}
        </h3>
        <ul>
          {#each anomalies as anomalie}
            <li>
              {#if anomalie.classification && anomalie.ligne}
                Feuille « {anomalie.classification} », ligne {anomalie.ligne} :
              {/if}
              {anomalie.message}
            </li>
          {/each}
        </ul>
      </div>
    {/if}
    <EspecesProtegeesGroupedByImpact
      espècesImpactées={impactEspece}
      identifiantPitchouVersActivitéEtImpactsQuantifiés={identifiantPitchouVersActiviteEtImpactsQuantifies}
    />
  {:catch}
    <p>Le fichier des espèces impactées n'a pas pu être lu.</p>
  {/await}
{:else}
  <p>Aucune données sur les espèces impactées n'a été fournie par le pétitionnaire</p>
{/if}
