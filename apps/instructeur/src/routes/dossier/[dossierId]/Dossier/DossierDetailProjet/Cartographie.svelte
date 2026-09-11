<script lang="ts">
  import DownloadButton from "$lib/components/DownloadButton.svelte";
  import CartographieProjet from "$lib/components/CartographieProjet.svelte";
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import ProjectField from "./ProjectField.svelte";
  import type { FieldChange as Change } from "@pitchou/types/notification.ts";

  type Props = { dossier: DossierFull; change?: Change };
  let { dossier, change }: Props = $props();

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

<ProjectField dossierId={dossier.id} label="" value={null} {change}>
  {#if cartographieProjet && cartographieProjet.features.length >= 1}
    <div class="flex justify-end">
      <!-- Inline style because a child component does not access the parent's classes -->
      <DownloadButton
        makeFileContentBlob={makeCartographieBlob}
        makeFilename={makeCartographieFilename}
        style="width: 15rem; max-width: 100%;"
        classname="fr-btn fr-btn--secondary"
        label="Télécharger la cartographie (.geojson)"
      />
    </div>
    <p>
      Cartographie du projet&nbsp;: {cartographieProjet.features.length}
      {cartographieProjet.features.length > 1 ? "zones tracées" : "zone tracée"}
    </p>
    {#key cartographieProjet}
      <CartographieProjet featureCollection={cartographieProjet} />
    {/key}
  {:else}
    <p>Aucune cartographie renseignée.</p>
  {/if}
</ProjectField>
