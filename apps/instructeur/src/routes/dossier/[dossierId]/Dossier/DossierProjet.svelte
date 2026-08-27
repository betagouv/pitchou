<script lang="ts">
  import DownloadButton from "$lib/components/DownloadButton.svelte";
  import CartographieProjet from "$lib/components/CartographieProjet.svelte";
  import EspecesProtegeesGroupedByTypeImpact from "$lib/components/EspecesProtegeesGroupedByTypeImpact.svelte";
  import { groupImpactsByTypeImpact } from "$lib/especes/groupImpactsByTypeImpact.ts";
  import { sendEvenement } from "$lib/shared/aarri.ts";

  import type { DossierFull, FrontEndImpactOnEspece } from "@pitchou/types/API_Pitchou.ts";
  import type { AnomalieFichierEspeces } from "@pitchou/types/especesImpact.d.ts";
  import FichierEspecesAlert from "./DossierProjet/FichierEspecesAlert.svelte";
  import ProjetInformation from "./DossierProjet/ProjetInformation.svelte";
  import ProjetScientifique from "./DossierProjet/ProjetScientifique.svelte";
  import ProjetSidebar from "./DossierProjet/ProjetSidebar.svelte";

  type Props = {
    dossier: DossierFull;
    anomalies: Promise<AnomalieFichierEspeces[]> | undefined;
  };

  let { dossier, anomalies }: Props = $props();

  function getNumberEspecesMinisterielleCNPN(impacts: FrontEndImpactOnEspece[]): {
    numberEspecesCNPN: number;
    numberEspecesMinisterielles: number;
  } {
    return impacts.reduce(
      (acc, { espece }) => {
        if (espece.especeCNPN) {
          acc["numberEspecesCNPN"] += 1;
        }
        if (espece.especeMinisterielle) {
          acc["numberEspecesMinisterielles"] += 1;
        }
        return acc;
      },
      { numberEspecesCNPN: 0, numberEspecesMinisterielles: 0 },
    );
  }

  const impacts = $derived(dossier.especesImpactees.impacts);
  const sourceFile = $derived(dossier.especesImpactees.sourceFile);
  const { numberEspecesCNPN, numberEspecesMinisterielles } = $derived(
    getNumberEspecesMinisterielleCNPN(impacts),
  );

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

  const cartographieProjet = $derived(dossier.projet_map);

  function makeCartographieBlob() {
    const fc = dossier.projet_map;
    if (!fc) {
      throw new Error("Aucune cartographie du projet à télécharger");
    }

    sendEvenement({
      type: "téléchargerCartographieProjet",
      details: { dossierId: dossier.id },
    });

    return new Blob([JSON.stringify(fc)], { type: "application/geo+json" });
  }

  function makeCartographieFilename() {
    return `cartographie-${dossier.id}.geojson`;
  }
</script>

<section
  class="flex flex-row [&>*:nth-child(1)]:flex-[3] [&>*:nth-child(1)]:mr-4 [&>*:nth-child(2)]:flex-[2]"
>
  <section>
    <ProjetInformation {dossier} />
    <h2 class="fr-mt-0 fr-mb-2w">Espèces impactées</h2>
    {#if sourceFile}
      <FichierEspecesAlert {anomalies} {makeFileContentBlob} {makeFilename} />
    {/if}
    {#if impacts.length >= 1}
      <p class="fr-badge fr-badge--blue-ecume">
        {numberEspecesCNPN}
        {numberEspecesCNPN > 1 ? "espèces" : "espèce"} CNPN
      </p>
      <p class="fr-badge fr-badge--blue-ecume">
        {numberEspecesMinisterielles}
        {numberEspecesCNPN > 1 ? "espèces" : "espèce"} Ministère
      </p>
      <EspecesProtegeesGroupedByTypeImpact
        especesParTypeImpact={groupImpactsByTypeImpact(impacts)}
      />
    {:else}
      <p>Aucune données sur les espèces impactées n'a été fournie par le pétitionnaire</p>
    {/if}

    {#if cartographieProjet && cartographieProjet.features.length >= 1}
      <div class="inline-flex items-center justify-between w-full fr-mt-6w">
        <h2 class="fr-m-0 whitespace-nowrap">Cartographie du projet</h2>
        <DownloadButton
          makeFileContentBlob={makeCartographieBlob}
          makeFilename={makeCartographieFilename}
          style="width: 15rem;"
          classname="fr-btn fr-btn--secondary"
          label="Télécharger la cartographie (.geojson)"
        />
      </div>
      <p>
        Cartographie du projet&nbsp;: {cartographieProjet.features.length}
        {cartographieProjet.features.length > 1 ? "zones tracées" : "zone tracée"}
      </p>
      <CartographieProjet featureCollection={cartographieProjet} />
    {/if}

    <ProjetScientifique {dossier} />
  </section>
  <ProjetSidebar {dossier} />
</section>
