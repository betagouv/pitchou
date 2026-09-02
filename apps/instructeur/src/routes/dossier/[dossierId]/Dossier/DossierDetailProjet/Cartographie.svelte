<script lang="ts">
  import DownloadButton from "$lib/components/DownloadButton.svelte";
  import CartographieProjet from "$lib/components/CartographieProjet.svelte";
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

  type Props = { dossier: DossierFull };
  let { dossier }: Props = $props();

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

{#if cartographieProjet && cartographieProjet.features.length >= 1}
  <div class="fr-mt-4w inline-flex w-full items-center justify-between">
    <h4 class="fr-m-0 fr-text--md whitespace-nowrap font-bold">Cartographie du projet</h4>
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
