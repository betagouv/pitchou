<script lang="ts">
  import type { DossierAdminFormModel } from "./dossierAdminFormModel.ts";
  import DossierIdentityFields from "./DossierIdentityFields.svelte";
  import DossierLegalDemandeurFields from "./DossierLegalDemandeurFields.svelte";
  import DossierOptionalIdentityFields from "./DossierOptionalIdentityFields.svelte";
  import DossierPhysicalDemandeurFields from "./DossierPhysicalDemandeurFields.svelte";

  type Props = { model: DossierAdminFormModel };
  let { model }: Props = $props();
</script>

<fieldset class="fr-fieldset w-full" aria-label="Porteur de projet">
  <legend class="fr-fieldset__legend fr-h3">1. Porteur de projet</legend>

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

  {#if model.demandeurType === "personne_physique"}
    <div class="fr-fieldset__element w-full flex flex-col gap-4">
      <h3 class="fr-h6 fr-mb-0">Identité du demandeur ou déposant</h3>
      <DossierIdentityFields identity={model.demandeurIdentity} idPrefix="edit-demandeur" />
    </div>
  {/if}

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
