<script lang="ts">
  import type { AdminGroupeInstructeurs } from "$lib/actions/adminDossiers.ts";

  import type { DossierAdminFormModel } from "./dossierAdminFormModel.ts";

  type Props = {
    model: DossierAdminFormModel;
    groupes: AdminGroupeInstructeurs[];
    groupesLoadError: string | null;
  };
  let { model, groupes, groupesLoadError }: Props = $props();
</script>

<fieldset class="fr-fieldset w-full" aria-label="Groupe instructeurs">
  <legend class="fr-fieldset__legend fr-text--bold">Groupe instructeurs</legend>
  <div class="fr-fieldset__element">
    <div class="fr-select-group w-full">
      <label class="fr-label" for="edit-groupe">
        Groupe instructeurs
        <span class="fr-hint-text">
          Le dossier n'est visible que par les instructeurs de ce groupe.
        </span>
      </label>
      <select
        class="fr-select w-full"
        id="edit-groupe"
        required
        bind:value={model.groupeInstructeurs}
      >
        {#if !model.groupeInstructeurs}<option value="">Sélectionner un groupe</option>{/if}
        {#each groupes as groupe (groupe.id)}
          <option value={groupe.id}>{groupe.name}</option>
        {/each}
      </select>
    </div>
    {#if groupesLoadError}<p class="fr-error-text" role="alert">{groupesLoadError}</p>{/if}
  </div>
</fieldset>
