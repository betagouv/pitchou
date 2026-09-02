<script lang="ts">
  import EspecesProtegeesGroupedByTypeImpact from "$lib/components/EspecesProtegeesGroupedByTypeImpact.svelte";
  import { groupImpactsByTypeImpact } from "$lib/especes/groupImpactsByTypeImpact.ts";
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import FichierEspecesAlert from "./FichierEspecesAlert.svelte";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { AnomalieFichierEspeces } from "@pitchou/types/especesImpact.d.ts";

  type Props = {
    dossier: DossierFull;
    anomalies: Promise<AnomalieFichierEspeces[]> | undefined;
  };

  let { dossier, anomalies }: Props = $props();

  const impacts = $derived(dossier.especesImpactees.impacts);
  const sourceFile = $derived(dossier.especesImpactees.sourceFile);

  async function makeFileContentBlob() {
    const especes = dossier.especesImpactees.sourceFile;
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
    return dossier.especesImpactees.sourceFile?.name || "fichier";
  }
</script>

{#if sourceFile}
  <FichierEspecesAlert {anomalies} {makeFileContentBlob} {makeFilename} />
{/if}
{#if impacts.length >= 1}
  <EspecesProtegeesGroupedByTypeImpact especesParTypeImpact={groupImpactsByTypeImpact(impacts)} />
{:else}
  <p>Aucune données sur les espèces impactées n'a été fournie par le pétitionnaire</p>
{/if}
