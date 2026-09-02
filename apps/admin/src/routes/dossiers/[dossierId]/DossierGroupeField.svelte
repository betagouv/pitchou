<script lang="ts">
  import Select from "@pitchou/ui/Select.svelte";

  import type { AdminGroupeInstructeurs } from "$lib/actions/adminDossiers.ts";

  import type { DossierAdminFormModel } from "./dossierAdminFormModel.ts";

  type Props = {
    model: DossierAdminFormModel;
    groupes: AdminGroupeInstructeurs[];
    groupesLoadError: string | null;
  };
  let { model, groupes, groupesLoadError }: Props = $props();

  const groupeOptions = $derived(
    groupes.map((groupe) => ({ value: groupe.id, label: groupe.name })),
  );
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
      <Select
        id="edit-groupe"
        class="fr-mt-1w w-full"
        placeholder="Sélectionner un groupe"
        required
        options={groupeOptions}
        bind:value={model.groupeInstructeurs}
      />
    </div>
    {#if groupesLoadError}<p class="fr-error-text" role="alert">{groupesLoadError}</p>{/if}
  </div>
</fieldset>
