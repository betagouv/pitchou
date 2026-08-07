<script lang="ts">
  import DownloadButton from "$lib/components/DownloadButton.svelte";
  import CartographieProjet from "$lib/components/CartographieProjet.svelte";
  import EspecesProtegeesGroupedByImpact from "$lib/components/EspecesProtegeesGroupedByImpact.svelte";
  import { loadActivitesMethodesMoyensDePoursuite } from "$lib/especes/activitesMethodesMoyensDePoursuite.ts";
  import Loader from "@pitchou/ui/Loader.svelte";
  import { sendEvenement } from "$lib/shared/aarri.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { DescriptionMenacesEspeces } from "@pitchou/types/especes.d.ts";
  import ProjetInformation from "./DossierProjet/ProjetInformation.svelte";
  import ProjetScientifique from "./DossierProjet/ProjetScientifique.svelte";
  import ProjetSidebar from "./DossierProjet/ProjetSidebar.svelte";

  type Props = {
    dossier: DossierFull;
    especesImpactees: Promise<DescriptionMenacesEspeces> | undefined;
  };

  let { dossier, especesImpactees }: Props = $props();

  /**
   * Computes the number of espèces CNPN
   * and the number of espèces ministérielles
   * in the list of espèces impacted by this project
   */
  function getNumberEspecesMinisterielleCNPN(_especesImpactees: DescriptionMenacesEspeces): {
    numberEspecesCNPN: number;
    numberEspecesMinisterielles: number;
  } {
    const allEspecesImpactees = [
      ...(_especesImpactees["faune non-oiseau"] ?? []),
      ...(_especesImpactees["flore"] ?? []),
      ...(_especesImpactees["oiseau"] ?? []),
    ];

    const numbers = allEspecesImpactees.reduce(
      (acc, { espèce: espece }) => {
        if (espece.espèceCNPN) {
          acc["numberEspecesCNPN"] += 1;
        }
        if (espece.espèceMinistérielle) {
          acc["numberEspecesMinisterielles"] += 1;
        }
        return acc;
      },
      { numberEspecesCNPN: 0, numberEspecesMinisterielles: 0 },
    );
    return numbers;
  }

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

  const referentielsPromise = loadActivitesMethodesMoyensDePoursuite();
</script>

<section
  class="flex flex-row [&>*:nth-child(1)]:flex-[3] [&>*:nth-child(1)]:mr-4 [&>*:nth-child(2)]:flex-[2]"
>
  <section>
    <ProjetInformation {dossier} />
    <div class="inline-flex items-center justify-between w-full">
      <h2 class="fr-m-0 whitespace-nowrap">Espèces impactées</h2>
      {#if dossier.especesImpactees}
        <!-- In Svelte, a child component does not have access to the style classes defined in the parent component in which it is called. So we use an inline style. -->
        {@const styleDownloadButton = "width: 15rem;"}
        <DownloadButton
          {makeFileContentBlob}
          {makeFilename}
          style={styleDownloadButton}
          classname="fr-btn fr-btn--secondary"
          label="Télécharger le fichier des espèces impactées"
        />
      {/if}
    </div>
    {#if dossier.especesImpactees}
      {#if especesImpactees}
        {#await Promise.all([especesImpactees, referentielsPromise])}
          <Loader></Loader>
        {:then [especesImpactees, { identifiantPitchouVersActivitéEtImpactsQuantifiés: identifiantPitchouVersActiviteEtImpactsQuantifies }]}
          {@const { numberEspecesCNPN, numberEspecesMinisterielles } =
            getNumberEspecesMinisterielleCNPN(especesImpactees)}
          <p class="fr-badge fr-badge--blue-ecume">
            {numberEspecesCNPN}
            {numberEspecesCNPN > 1 ? "espèces" : "espèce"} CNPN
          </p>
          <p class="fr-badge fr-badge--blue-ecume">
            {numberEspecesMinisterielles}
            {numberEspecesCNPN > 1 ? "espèces" : "espèce"} Ministère
          </p>
          <EspecesProtegeesGroupedByImpact
            espècesImpactées={especesImpactees}
            identifiantPitchouVersActivitéEtImpactsQuantifiés={identifiantPitchouVersActiviteEtImpactsQuantifies}
          />
        {/await}
      {/if}
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
