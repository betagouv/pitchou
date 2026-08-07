<script lang="ts">
  import type { DossierCreationModel } from "./dossierCreationModel.ts";
  import AddressAutocomplete from "./AddressAutocomplete.svelte";
  let { model }: { model: DossierCreationModel } = $props();
  function toggleManual(checked: boolean) {
    model.eolienCarcassAddressManual = checked;
    if (checked)
      requestAnimationFrame(() =>
        document.getElementById("carcass-examination-address-manual")?.focus(),
      );
  }
</script>

<section
  class="border-t border-[color:var(--border-default-grey)] fr-pt-4w fr-mt-5w"
  aria-labelledby="carcass-analysis-title"
>
  <h4 class="fr-h4" id="carcass-analysis-title">
    8.3.1. Précisions sur le transport des cadavres pour analyse au bureau
  </h4>
  <div class="fr-input-group w-full fr-mb-4w">
    <label class="fr-label" for="carcass-collection-method"
      >Description du mode de collecte sur le terrain</label
    >
    <textarea
      class="fr-input"
      id="carcass-collection-method"
      rows="5"
      bind:value={model.eolienCarcassCollectionMethod}></textarea>
  </div>
  <div class="fr-input-group w-full fr-mb-4w">
    <label class="fr-label" for="carcass-preservation-method">Méthode de conservation</label>
    <textarea
      class="fr-input"
      id="carcass-preservation-method"
      rows="5"
      bind:value={model.eolienCarcassPreservationMethod}></textarea>
  </div>
  <div class="fr-mb-2w">
    {#if model.eolienCarcassAddressManual}
      <div class="fr-input-group">
        <label class="fr-label" for="carcass-examination-address-manual"
          >Adresse des locaux où seront examinés les cadavres</label
        >
        <input
          class="fr-input"
          id="carcass-examination-address-manual"
          bind:value={model.eolienCarcassExaminationAddress}
        />
      </div>
    {:else}
      <AddressAutocomplete
        id="carcass-examination-address"
        label="Adresse des locaux où seront examinés les cadavres"
        hint="Saisissez une adresse, une voie, un lieu-dit ou une commune. Exemple : 11 rue Réaumur, Paris"
        value={model.eolienCarcassExaminationAddress}
        onChange={(value) => (model.eolienCarcassExaminationAddress = value)}
      />
    {/if}
  </div>
  <div class="fr-checkbox-group">
    <input
      id="carcass-address-manual"
      type="checkbox"
      checked={model.eolienCarcassAddressManual}
      onchange={(event) => toggleManual(event.currentTarget.checked)}
    />
    <label class="fr-label" for="carcass-address-manual"
      >Je ne trouve pas mon adresse dans les suggestions</label
    >
  </div>
</section>
