<script lang="ts">
  import AddressAutocomplete from "./AddressAutocomplete.svelte";
  import type { DossierCreationModel } from "./dossierCreationModel.ts";

  let { model }: { model: DossierCreationModel } = $props();
</script>

<div class="flex flex-col gap-6 fr-mb-3w">
  <div class="fr-input-group w-full">
    <label class="fr-label" for="physical-qualification">
      Qualification
      <span class="fr-hint-text">Si le demandeur est une personne physique</span>
    </label>
    <input
      class="fr-input w-full"
      id="physical-qualification"
      type="text"
      bind:value={model.physicalQualification}
    />
  </div>

  <AddressAutocomplete
    id="physical-address-search"
    label="Adresse"
    hint="Saisissez une adresse, une voie, un lieu-dit ou une commune. Exemple : 11 rue Réaumur, Paris"
    value={model.physicalAddress}
    onChange={(value) => (model.physicalAddress = value)}
  />

  <div class="fr-checkbox-group">
    <input
      id="physical-manual-address"
      type="checkbox"
      checked={model.physicalManualAddress}
      onchange={(event) =>
        (model.physicalManualAddress = (event.currentTarget as HTMLInputElement).checked)}
    />
    <label class="fr-label" for="physical-manual-address">
      Je ne trouve pas mon adresse dans les suggestions
    </label>
  </div>

  {#if model.physicalManualAddress}
    <fieldset class="border border-[color:var(--border-default-grey)] fr-p-3w">
      <legend class="fr-sr-only">Saisie manuelle de l'adresse</legend>
      <div class="flex flex-col gap-6">
        <div class="fr-select-group w-full md:w-1/3">
          <label class="fr-label" for="physical-country">Pays</label>
          <select class="fr-select" id="physical-country" bind:value={model.physicalCountry}>
            <option value="France">France</option>
            <option value="Autre pays">Autre pays</option>
          </select>
        </div>

        {#if model.physicalCountry === "Autre pays"}
          <div class="fr-input-group w-full md:w-1/3">
            <label class="fr-label" for="physical-other-country">Précisez le pays</label>
            <input
              class="fr-input"
              id="physical-other-country"
              type="text"
              bind:value={model.physicalOtherCountry}
            />
          </div>
        {/if}

        <div class="fr-input-group w-full">
          <label class="fr-label" for="physical-street">
            Numéro et nom de voie, ou lieu-dit
            <span class="fr-hint-text">Exemple : 11 rue des Mimosas</span>
          </label>
          <input
            class="fr-input"
            id="physical-street"
            type="text"
            bind:value={model.physicalStreet}
          />
        </div>

        <AddressAutocomplete
          id="physical-city"
          label="Ville ou commune"
          hint="Renseignez le nom ou le code postal de la ville puis sélectionnez la commune dans la liste. Exemple : Strasbourg"
          kind="municipality"
          value={model.physicalCity}
          onChange={(value) => (model.physicalCity = value)}
        />
      </div>
    </fieldset>
  {/if}
</div>
