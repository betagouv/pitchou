<script lang="ts">
  import { store } from "$lib/state/store.svelte.ts";
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import type { DossiersExportFormat } from "@pitchou/types/dossierExport.ts";
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type { FilterChip, Localisation } from "./listModel.ts";
  import Select from "@pitchou/ui/Select.svelte";

  let {
    followedOnly = false,
    localisation = "assigned",
    dossierIds,
    chips = [],
  }: {
    followedOnly?: boolean;
    localisation?: Localisation;
    dossierIds: DossierSummary["id"][];
    chips?: FilterChip[];
  } = $props();
  let dialog: HTMLDialogElement;
  let format = $state<DossiersExportFormat>("ods");
  let exporting = $state(false);
  let errorMessage = $state("");
  let statusMessage = $state("");

  function openExport() {
    errorMessage = "";
    statusMessage = "";
    sendEvenement({
      type: "clickExportDossiers",
      details: { page: followedOnly ? "mes-dossiers" : "tous-les-dossiers" },
    });
    dialog.showModal();
  }

  async function download() {
    const exportDossiers = store.capabilities.exporterDossiers;
    if (!exportDossiers || exporting) return;
    exporting = true;
    errorMessage = "";
    const selectedFormat = format;
    const scope = followedOnly ? "followed" : localisation === "france" ? "france" : "service";
    const selectedIds = [...dossierIds];
    const downloadPage = followedOnly ? "mes-dossiers" : "tous-les-dossiers";
    try {
      const blob = await exportDossiers(scope, selectedFormat, selectedIds);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const prefix = followedOnly
        ? "mes-dossiers"
        : scope === "france"
          ? "tous-les-dossiers"
          : "dossiers-service";
      link.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.${selectedFormat}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      sendEvenement({
        type: "downloadDossiersExport",
        details: {
          page: downloadPage,
          format: selectedFormat,
          scope,
          dossierCount: selectedIds.length,
        },
      });
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      statusMessage = "L'export des dossiers a été téléchargé.";
      dialog.close();
    } catch (error) {
      console.error("Erreur lors de l'export des dossiers :", error);
      errorMessage = "L'export des dossiers a échoué. Veuillez réessayer.";
    } finally {
      exporting = false;
    }
  }
</script>

<button
  type="button"
  class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-download-line fr-btn--icon-left"
  aria-haspopup="dialog"
  disabled={!store.capabilities.exporterDossiers || exporting}
  onclick={openExport}
>
  Exporter les dossiers
</button>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={dialog}
  aria-labelledby="export-dossiers-title"
  class="pitchou-dialog m-auto border-0 rounded max-w-[min(36rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] fr-p-3w"
  onclick={(event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      dialog.close();
  }}
>
  <div class="flex justify-end">
    <button
      type="button"
      class="fr-btn fr-btn--tertiary-no-outline fr-icon-close-line fr-btn--icon-right"
      onclick={() => dialog.close()}>Fermer</button
    >
  </div>
  <h2 id="export-dossiers-title">Exporter les dossiers</h2>
  <p>
    Vous allez exporter <strong
      >{dossierIds.length} dossier{dossierIds.length > 1 ? "s" : ""}</strong
    >
    de la page "{followedOnly ? "Mes dossiers" : "Tous les dossiers"}". L'export prend en compte les
    filtres actifs et inclut toutes les pages de résultats.
  </p>
  {#if chips.length > 0}
    <p class="fr-mb-1w">Filtres actifs :</p>
    <ul class="fr-tags-group fr-tags-group--sm">
      {#each chips as chip (chip.key)}
        <li><span class="fr-tag">{chip.label}</span></li>
      {/each}
    </ul>
  {:else}
    <p class="fr-text--sm">Aucun filtre actif.</p>
  {/if}
  <div class="fr-select-group">
    <label class="fr-label" for="export-dossiers-format">Format du fichier</label>
    <Select
      id="export-dossiers-format"
      bind:value={format}
      disabled={exporting}
      options={[
        { value: "ods" as const, label: "ODS, tableur LibreOffice" },
        { value: "csv" as const, label: "CSV, compatible avec Grist" },
      ]}
    />
  </div>
  <p class="fr-text--sm">Pour Grist, téléchargez le CSV puis importez-le dans votre document.</p>
  {#if errorMessage}
    <p class="fr-error-text" role="alert">{errorMessage}</p>
  {/if}
  <button
    type="button"
    class="fr-btn fr-icon-download-line fr-btn--icon-left"
    disabled={exporting || dossierIds.length === 0}
    onclick={download}>{exporting ? "Export en cours…" : "Télécharger l'export"}</button
  >
  <p class="fr-sr-only" role="status">{exporting ? "Export en cours." : ""}</p>
</dialog>
<p class="fr-sr-only" role="status">{statusMessage}</p>
