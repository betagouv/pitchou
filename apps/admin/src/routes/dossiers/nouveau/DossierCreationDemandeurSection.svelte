<script lang="ts">
  import LegalDemandeurFields from "./LegalDemandeurFields.svelte";
  import PhysicalDemandeurFields from "./PhysicalDemandeurFields.svelte";
  import { type CompanyDetailsChoice, type DossierCreationModel } from "./dossierCreationModel.ts";

  let {
    model,
    originalLegalSiret,
    companyDetailsChoice = "",
    onCompanyDetailsChoice = () => {},
    showPorteurErrors = false,
  }: {
    model: DossierCreationModel;
    originalLegalSiret?: string | null;
    companyDetailsChoice?: CompanyDetailsChoice;
    onCompanyDetailsChoice?: (choice: CompanyDetailsChoice) => void;
    showPorteurErrors?: boolean;
  } = $props();
  const typeMissing = $derived(showPorteurErrors && !model.demandeurType);
</script>

<section
  class="border-t border-[color:var(--border-default-grey)] fr-pt-4w"
  aria-labelledby="demandeur-title"
>
  <h2 class="fr-h2" id="demandeur-title">3. Porteur de projet</h2>

  <fieldset
    class="fr-fieldset"
    class:fr-fieldset--error={typeMissing}
    aria-describedby={typeMissing ? "demandeur-type-error" : undefined}
  >
    <legend class="fr-fieldset__legend font-normal">
      Le porteur de projet est... <span aria-hidden="true">*</span>
      <span class="fr-sr-only">Champ obligatoire</span>
    </legend>
    <div class="fr-fieldset__element">
      <div class="fr-radio-group">
        <input
          id="demandeur-physical"
          type="radio"
          value="personne_physique"
          required
          bind:group={model.demandeurType}
        />
        <label class="fr-label" for="demandeur-physical">une personne physique</label>
      </div>
    </div>
    <div class="fr-fieldset__element">
      <div class="fr-radio-group">
        <input
          id="demandeur-legal"
          type="radio"
          value="personne_morale"
          bind:group={model.demandeurType}
        />
        <label class="fr-label" for="demandeur-legal">une personne morale</label>
      </div>
    </div>
    {#if typeMissing}
      <p class="fr-error-text fr-fieldset__element" id="demandeur-type-error">
        Indiquez si le porteur de projet est une personne physique ou morale.
      </p>
    {/if}
  </fieldset>

  {#if model.demandeurType === "personne_physique"}
    <PhysicalDemandeurFields {model} showErrors={showPorteurErrors} />
  {:else if model.demandeurType === "personne_morale"}
    <LegalDemandeurFields
      {model}
      {originalLegalSiret}
      {companyDetailsChoice}
      {onCompanyDetailsChoice}
      showErrors={showPorteurErrors}
    />
  {/if}

  <div class="flex flex-col gap-6 fr-mt-4w">
    <div class="fr-input-group w-full">
      <label class="fr-label" for="contact-phone">
        Numéro de téléphone de contact
        <span class="fr-hint-text"
          >Format attendu : un numéro de téléphone valide. Exemple : 0612345678</span
        >
      </label>
      <input
        class="fr-input w-full lg:w-1/3"
        id="contact-phone"
        type="tel"
        autocomplete="tel"
        pattern={"[0-9+(). -]{10,20}"}
        bind:value={model.contactPhone}
      />
    </div>
    <div class="fr-input-group w-full lg:w-2/3">
      <label class="fr-label" for="contact-email">
        Adresse mail de contact <span class="fr-hint-text">Exemple : adresse@mail.com</span>
      </label>
      <input
        class="fr-input"
        id="contact-email"
        type="email"
        autocomplete="email"
        bind:value={model.contactEmail}
      />
    </div>
  </div>
</section>
