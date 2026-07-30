<script lang="ts">
  import type { FeatureCollection } from "./dossierAdminFormModel.ts";
  import ProjectMapCanvas from "./ProjectMapCanvas.svelte";
  import ProjectMapFeatureList from "./ProjectMapFeatureList.svelte";

  type Props = {
    value: FeatureCollection | null;
    disabled?: boolean;
    onChange: (value: FeatureCollection | null) => void;
  };
  let { value, disabled = false, onChange }: Props = $props();
  let error = $state<string | null>(null);

  async function loadFile(event: Event & { currentTarget: HTMLInputElement }) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    error = null;
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Le fichier doit contenir un objet GeoJSON.");
      }
      const candidate = parsed as Record<string, unknown>;
      if (candidate.type !== "FeatureCollection" || !Array.isArray(candidate.features)) {
        throw new Error("Le fichier doit être une FeatureCollection GeoJSON.");
      }
      onChange(parsed as FeatureCollection);
    } catch (caught) {
      error = caught instanceof SyntaxError ? "Le fichier JSON n'est pas valide." : String(caught);
      if (caught instanceof Error && !(caught instanceof SyntaxError)) error = caught.message;
    } finally {
      input.value = "";
    }
  }
</script>

<div class="w-full" class:fr-upload-group--error={error !== null}>
  <h3 class="fr-h6">Cartographie du projet</h3>
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

  <details class="fr-mt-3w">
    <summary>Importer un fichier GeoJSON</summary>
    <div class="fr-upload-group fr-mt-2w">
      <label class="fr-label" for="edit-project-map">
        Cartographie du projet
        <span class="fr-hint-text">Fichier GeoJSON ou JSON contenant une FeatureCollection.</span>
      </label>
      <input
        class="fr-upload"
        id="edit-project-map"
        type="file"
        accept=".geojson,.json,application/geo+json,application/json"
        {disabled}
        onchange={loadFile}
      />
      {#if error}<p class="fr-error-text">{error}</p>{/if}
    </div>
  </details>
</div>
