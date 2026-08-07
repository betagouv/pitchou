<script lang="ts">
  import type { FeatureCollection } from "./dossierAdminFormModel.ts";
  import { parseProjectMapFile } from "./projectMapFile.ts";
  import ProjectMapCanvas from "./ProjectMapCanvas.svelte";
  import ProjectMapFeatureList from "./ProjectMapFeatureList.svelte";

  type Props = {
    value: FeatureCollection | null;
    disabled?: boolean;
    inputId?: string;
    onChange: (value: FeatureCollection | null) => void;
  };
  let { value, disabled = false, inputId = "edit-project-map", onChange }: Props = $props();
  let error = $state<string | null>(null);
  let fileInput: HTMLInputElement;

  async function loadFile(event: Event & { currentTarget: HTMLInputElement }) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    error = null;
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      error = "Le fichier ne doit pas dépasser 10 Mo.";
      input.value = "";
      return;
    }
    try {
      const parsed = parseProjectMapFile(file.name, await file.text());
      onChange({
        type: "FeatureCollection",
        features: [...(value?.features ?? []), ...parsed.features],
      });
    } catch (caught) {
      error = caught instanceof SyntaxError ? "Le fichier JSON n'est pas valide." : String(caught);
      if (caught instanceof Error && !(caught instanceof SyntaxError)) error = caught.message;
    } finally {
      input.value = "";
    }
  }
</script>

<div class="w-full" class:fr-upload-group--error={error !== null}>
  <h3 class="fr-h6">Cartographie de l'emprise du projet</h3>
  <p class="fr-hint-text">
    Besoin d'aide ?
    <a
      class="fr-link"
      href="https://doc.demarches-simplifiees.fr/pour-aller-plus-loin/cartographie"
      target="_blank"
      rel="noreferrer">Consulter les tutoriels vidéo</a
    >
  </p>
  <p class="fr-hint-text fr-mb-1v">
    Pour nous indiquer l'emprise du projet, merci d'utiliser l'une des options suivantes :
  </p>
  <ul class="fr-hint-text fr-mt-0">
    <li>Dessiner un polygone</li>
    <li>Sélectionner les parcelles</li>
    <li>Importer un fichier (format GPX ou KML)</li>
  </ul>

  <div class="fr-mb-3w">
    <button
      class="fr-btn fr-btn--secondary fr-icon-add-circle-line fr-btn--icon-left"
      type="button"
      {disabled}
      onclick={() => fileInput.click()}
    >
      Ajouter un fichier GPX ou KML
    </button>
    <input
      class="fr-sr-only"
      id={inputId}
      bind:this={fileInput}
      type="file"
      tabindex="-1"
      aria-label="Importer un fichier cartographique"
      accept=".gpx,.kml,.geojson,.json,application/gpx+xml,application/vnd.google-earth.kml+xml,application/geo+json,application/json"
      {disabled}
      onchange={loadFile}
    />
    {#if error}<p class="fr-error-text" role="alert">{error}</p>{/if}
  </div>

  <ProjectMapCanvas {value} {disabled} {onChange} />

  {#if value}
    <ProjectMapFeatureList {value} {disabled} {onChange} />
    <div class="flex items-center gap-4 flex-wrap fr-mt-2w">
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-delete-line fr-btn--icon-left"
        {disabled}
        onclick={() => {
          error = null;
          onChange(null);
        }}>Tout supprimer</button
      >
    </div>
  {/if}
</div>
