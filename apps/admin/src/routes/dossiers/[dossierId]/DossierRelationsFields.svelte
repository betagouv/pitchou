<script lang="ts">
  import type { AdminGroupeInstructeurs } from "$lib/actions/adminDossiers.ts";

  import type { DossierAdminFormModel } from "./dossierAdminFormModel.ts";
  import DossierIdentityFields from "./DossierIdentityFields.svelte";
  import DossierLegalDemandeurFields from "./DossierLegalDemandeurFields.svelte";
  import DossierOptionalIdentityFields from "./DossierOptionalIdentityFields.svelte";
  import DossierPhysicalDemandeurFields from "./DossierPhysicalDemandeurFields.svelte";

  type Props = {
    model: DossierAdminFormModel;
    groupes: AdminGroupeInstructeurs[];
    groupesLoadError: string | null;
  };
  let { model, groupes, groupesLoadError }: Props = $props();
</script>

<fieldset class="fr-fieldset w-full" aria-label="Porteur de projet et groupe instructeurs">
  <legend class="fr-fieldset__legend fr-text--bold">Porteur de projet</legend>

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
    {#if groupesLoadError}
      <p class="fr-error-text" role="alert">{groupesLoadError}</p>
    {/if}
  </div>

  <div class="fr-fieldset__element">
    <h3 class="fr-h6 fr-mb-2w">Type de demandeur</h3>
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="fr-radio-group">
        <input
          id="edit-demandeur-physical"
          type="radio"
          value="personne_physique"
          required
          bind:group={model.demandeurType}
        />
        <label class="fr-label" for="edit-demandeur-physical">Personne physique</label>
      </div>
      <div class="fr-radio-group">
        <input
          id="edit-demandeur-legal"
          type="radio"
          value="personne_morale"
          bind:group={model.demandeurType}
        />
        <label class="fr-label" for="edit-demandeur-legal">Personne morale</label>
      </div>
    </div>
  </div>

  <div class="fr-fieldset__element w-full flex flex-col gap-4">
    <h3 class="fr-h6 fr-mb-0">Identité du demandeur ou déposant</h3>
    <DossierIdentityFields
      identity={model.demandeurIdentity}
      idPrefix="edit-demandeur"
      lastNameRequired={true}
    />
  </div>

  <div class="fr-fieldset__element w-full flex flex-col gap-4">
    {#if model.demandeurType === "personne_physique"}
      <h3 class="fr-h6 fr-mb-0">Informations de la personne physique</h3>
      <DossierPhysicalDemandeurFields {model} />
    {:else}
      <h3 class="fr-h6 fr-mb-0">Informations de la personne morale</h3>
      <DossierLegalDemandeurFields {model} />
      <DossierOptionalIdentityFields
        identity={model.representant}
        kind="representant"
        bind:enabled={model.hasRepresentant}
      />
    {/if}
  </div>

  <div class="fr-fieldset__element w-full">
    <DossierOptionalIdentityFields
      identity={model.mandataire}
      kind="mandataire"
      bind:enabled={model.hasMandataire}
    />
  </div>
</fieldset>
