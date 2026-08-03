<script lang="ts">
  import PhysicalDemandeurFields from "./PhysicalDemandeurFields.svelte";
  import type { DossierCreationModel } from "./dossierCreationModel.ts";

  let { model }: { model: DossierCreationModel } = $props();
</script>

<section
  class="border-t border-[color:var(--border-default-grey)] fr-pt-4w"
  aria-labelledby="demandeur-title"
>
  <h2 class="fr-h2" id="demandeur-title">3. Porteur de projet</h2>

  <fieldset class="fr-fieldset">
    <legend class="fr-fieldset__legend font-normal">
      Le demandeur est... <span aria-hidden="true">*</span>
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
  </fieldset>

  {#if model.demandeurType === "personne_physique"}
    <PhysicalDemandeurFields {model} />
  {:else if model.demandeurType === "personne_morale"}
    <div class="flex flex-col gap-6 fr-mb-3w">
      <div class="fr-input-group w-full">
        <label class="fr-label" for="legal-siret">
          Numéro de SIRET
          <span class="fr-hint-text">
            Format attendu : 14 chiffres. Exemple : 500 001 234 56789
          </span>
        </label>
        <input
          class="fr-input w-full lg:w-1/3"
          id="legal-siret"
          type="text"
          inputmode="numeric"
          pattern={"[0-9 ]{14,17}"}
          minlength="14"
          maxlength="17"
          required
          bind:value={model.legalSiret}
        />
      </div>

      <div class="fr-input-group w-full">
        <label class="fr-label" for="representative-last-name">
          Nom du représentant
          <span class="fr-hint-text">
            Personne en charge du projet au sein de la personne morale
          </span>
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
          <span class="fr-hint-text">
            Personne en charge du projet au sein de la personne morale
          </span>
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
          <span class="fr-hint-text">Si le demandeur est une personne morale</span>
        </label>
        <input
          class="fr-input w-full"
          id="representative-role"
          type="text"
          bind:value={model.representativeRole}
        />
      </div>
    </div>
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
