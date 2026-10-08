<script lang="ts">
  import {
    legalSiretError,
    type CompanyDetailsChoice,
    type DossierCreationModel,
  } from "./dossierCreationModel.ts";

  let {
    model,
    originalLegalSiret,
    companyDetailsChoice = "",
    onCompanyDetailsChoice = () => {},
    showErrors = false,
  }: {
    model: DossierCreationModel;
    originalLegalSiret?: string | null;
    companyDetailsChoice?: CompanyDetailsChoice;
    onCompanyDetailsChoice?: (choice: CompanyDetailsChoice) => void;
    showErrors?: boolean;
  } = $props();

  const siretError = $derived(showErrors ? legalSiretError(model.legalSiret) : null);
  const legalSiretChanged = $derived(
    !!originalLegalSiret && originalLegalSiret !== model.legalSiret.replaceAll(" ", ""),
  );
</script>

<div class="flex flex-col gap-6 fr-mb-3w">
  <div class="fr-input-group w-full" class:fr-input-group--error={siretError}>
    <label class="fr-label" for="legal-siret">
      Numéro de SIRET
      <span class="fr-hint-text"> Format attendu : 14 chiffres. Exemple : 500 001 234 56789 </span>
    </label>
    <input
      class="fr-input w-full lg:w-1/3"
      class:fr-input--error={siretError}
      id="legal-siret"
      type="text"
      inputmode="numeric"
      pattern={"[0-9 ]{14,17}"}
      minlength="14"
      maxlength="17"
      required
      aria-invalid={siretError ? true : undefined}
      aria-describedby={siretError ? "legal-siret-error" : undefined}
      bind:value={model.legalSiret}
    />
    {#if siretError}
      <p class="fr-error-text" id="legal-siret-error">{siretError}</p>
    {/if}
  </div>

  {#if legalSiretChanged}
    <fieldset class="fr-fieldset fr-alert fr-alert--warning">
      <legend class="fr-fieldset__legend fr-alert__title">
        Vous modifiez le numéro de SIRET
      </legend>
      <p>
        Voulez-vous conserver les informations actuelles de l'entreprise ou les réinitialiser pour
        le nouveau SIRET ?
      </p>
      <div class="fr-fieldset__element">
        <div class="fr-radio-group">
          <input
            id="company-details-keep"
            type="radio"
            name="company-details-choice"
            value="keep"
            checked={companyDetailsChoice === "keep"}
            onchange={() => onCompanyDetailsChoice("keep")}
          />
          <label class="fr-label" for="company-details-keep">
            Conserver les informations actuelles
          </label>
        </div>
      </div>
      <div class="fr-fieldset__element">
        <div class="fr-radio-group">
          <input
            id="company-details-reset"
            type="radio"
            name="company-details-choice"
            value="reset"
            checked={companyDetailsChoice === "reset"}
            onchange={() => onCompanyDetailsChoice("reset")}
          />
          <label class="fr-label" for="company-details-reset">
            Réinitialiser les informations de l'entreprise
          </label>
        </div>
      </div>
    </fieldset>
  {/if}

  <div class="fr-input-group w-full">
    <label class="fr-label" for="representative-last-name">
      Nom du représentant
      <span class="fr-hint-text"> Personne en charge du projet au sein de la personne morale </span>
    </label>
    <input
      class="fr-input w-full"
      id="representative-last-name"
      type="text"
      bind:value={model.representativeLastName}
    />
  </div>

  <div class="fr-input-group w-full">
    <label class="fr-label" for="representative-first-names">
      Prénom du représentant
      <span class="fr-hint-text"> Personne en charge du projet au sein de la personne morale </span>
    </label>
    <input
      class="fr-input w-full"
      id="representative-first-names"
      type="text"
      bind:value={model.representativeFirstNames}
    />
  </div>

  <div class="fr-input-group w-full">
    <label class="fr-label" for="representative-role">
      Qualité du représentant
      <span class="fr-hint-text">Si le porteur de projet est une personne morale</span>
    </label>
    <input
      class="fr-input w-full"
      id="representative-role"
      type="text"
      bind:value={model.representativeRole}
    />
  </div>
</div>
