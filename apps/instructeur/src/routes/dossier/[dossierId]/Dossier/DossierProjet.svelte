<script lang="ts">
  import DownloadButton from "$lib/components/DownloadButton.svelte";
  import CartographieProjet from "$lib/components/CartographieProjet.svelte";
  import EspecesProtegeesGroupedByTypeImpact from "$lib/components/EspecesProtegeesGroupedByTypeImpact.svelte";
  import { anomaliesTitle } from "@pitchou/common/impact_espece/anomalies.ts";
  import { groupImpactsByTypeImpact } from "$lib/especes/groupImpactsByTypeImpact.ts";
  import { sendEvenement } from "$lib/shared/aarri.ts";

  import type { DossierFull, FrontEndImpactOnEspece } from "@pitchou/types/API_Pitchou.ts";
  import type { AnomalieFichierEspeces } from "@pitchou/types/especesImpact.d.ts";
  import ProjetInformation from "./DossierProjet/ProjetInformation.svelte";
  import ProjetScientifique from "./DossierProjet/ProjetScientifique.svelte";
  import ProjetSidebar from "./DossierProjet/ProjetSidebar.svelte";

  type Props = {
    dossier: DossierFull;
    anomalies: Promise<AnomalieFichierEspeces[]> | undefined;
  };

  let { dossier, anomalies }: Props = $props();

  /**
   * Computes the number of espèces CNPN
   * and the number of espèces ministérielles
   * in the list of espèces impacted by this project
   */
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
    <div class="inline-flex items-center justify-between w-full">
      <h2 class="fr-m-0 whitespace-nowrap">Espèces impactées</h2>
      {#if sourceFile}
        <!-- In Svelte, a child component does not have access to the style classes defined in the parent component in which it is called. So we use an inline style. -->
        {@const styleDownloadButton = "width: 15rem;"}
        <DownloadButton
          {makeFileContentBlob}
          {makeFilename}
          style={styleDownloadButton}
          classname="fr-btn fr-btn--secondary"
          label="Télécharger le fichier original"
        />
      {/if}
    </div>
    <!-- The espèces come from the database, so they display right away. The anomalies of the
    fichier original are read from the file itself, which takes a request: they show up after. -->
    {#await anomalies then anomaliesFichier}
      {#if anomaliesFichier && anomaliesFichier.length >= 1}
        <div class="fr-alert fr-alert--warning fr-mb-2w" role="status">
          <h3 class="fr-alert__title">{anomaliesTitle(anomaliesFichier)}</h3>
          <ul>
            {#each anomaliesFichier as anomalie}
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
    {/await}
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
        <!-- Inline style because a child component does not access the parent's classes -->
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
