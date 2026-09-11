<script lang="ts">
  import Select from "@pitchou/ui/Select.svelte";
  import { motifDerogationOptions } from "@pitchou/common/dossierFormOptions.ts";

  import type { DossierAdminFormModel } from "./dossierAdminFormModel.ts";

  type Props = { model: DossierAdminFormModel; disabled: boolean };
  let { model, disabled }: Props = $props();

  const hasLegacyMotif = $derived(
    !!model.motifDerogation && !motifDerogationOptions.includes(model.motifDerogation as never),
  );
  // A value predating the current list stays selectable, so opening a dossier
  // never silently drops it.
  const motifOptions = $derived([
    { value: "", label: "Non renseigné" },
    ...(hasLegacyMotif
      ? [{ value: model.motifDerogation, label: `${model.motifDerogation} (valeur historique)` }]
      : []),
    ...motifDerogationOptions.map((option) => ({ value: option, label: option })),
  ]);
</script>

<fieldset class="fr-fieldset w-full" aria-label="Dérogation" {disabled}>
  <legend class="fr-fieldset__legend fr-h3">4. Justifications de la demande de dérogation</legend>
  <div class="fr-fieldset__element">
    <div class="fr-input-group w-full">
      <label class="fr-label" for="edit-no-other-solution">
        Justification de l'absence d'autre solution satisfaisante
      </label>
      <textarea
        class="fr-input w-full"
        id="edit-no-other-solution"
        rows="4"
        bind:value={model.noOtherSatisfactorySolutionJustification}></textarea>
    </div>
  </div>
  <div class="fr-fieldset__element">
    <div class="fr-select-group w-full">
      <label class="fr-label" for="edit-motif-derogation">Motif de dérogation</label>
      <Select
        id="edit-motif-derogation"
        class="fr-mt-1w"
        options={motifOptions}
        bind:value={model.motifDerogation}
      />
    </div>
  </div>
  {#if model.motifDerogation}
    <div class="fr-fieldset__element">
      <div class="fr-input-group w-full">
        <label class="fr-label" for="edit-motif-justification">
          Synthèse des éléments justifiant le motif de la dérogation
        </label>
        <textarea
          class="fr-input w-full"
          id="edit-motif-justification"
          rows="4"
          bind:value={model.motifDerogationJustification}></textarea>
      </div>
    </div>
  {/if}
</fieldset>
