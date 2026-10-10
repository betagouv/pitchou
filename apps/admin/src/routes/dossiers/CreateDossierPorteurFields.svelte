<script lang="ts">
  import {
    porteurFieldIds,
    porteurFormErrors,
    type PorteurField,
    type PorteurForm,
  } from "./createDossierPorteur.ts";

  let {
    form = $bindable(),
    showErrors,
    disabled,
  }: { form: PorteurForm; showErrors: boolean; disabled: boolean } = $props();
  const errors = $derived(showErrors ? porteurFormErrors(form) : {});
  const errorId = (field: PorteurField) => `${porteurFieldIds[field]}-error`;
</script>

{#snippet textInput(field: "lastName" | "firstNames" | "siret", label: string, hint?: string)}
  <div class="fr-input-group" class:fr-input-group--error={errors[field]}>
    <label class="fr-label" for={porteurFieldIds[field]}>
      {label} *
      {#if hint}<span class="fr-hint-text">{hint}</span>{/if}
    </label>
    <input
      class="fr-input"
      class:fr-input--error={errors[field]}
      id={porteurFieldIds[field]}
      inputmode={field === "siret" ? "numeric" : undefined}
      aria-invalid={errors[field] ? true : undefined}
      aria-describedby={errors[field] ? errorId(field) : undefined}
      {disabled}
      bind:value={form[field]}
    />
    {#if errors[field]}<p class="fr-error-text" id={errorId(field)}>{errors[field]}</p>{/if}
  </div>
{/snippet}

<fieldset
  class="fr-fieldset"
  class:fr-fieldset--error={errors.type}
  aria-describedby={errors.type ? errorId("type") : undefined}
>
  <legend class="fr-fieldset__legend font-normal">Le porteur de projet est... *</legend>
  {#each [["personne_physique", "une personne physique"], ["personne_morale", "une personne morale"]] as [value, label] (value)}
    <div class="fr-fieldset__element">
      <div class="fr-radio-group">
        <input
          id={value === "personne_physique" ? porteurFieldIds.type : "new-porteur-morale"}
          type="radio"
          {value}
          {disabled}
          bind:group={form.type}
        />
        <label
          class="fr-label"
          for={value === "personne_physique" ? porteurFieldIds.type : "new-porteur-morale"}
          >{label}</label
        >
      </div>
    </div>
  {/each}
  {#if errors.type}
    <p class="fr-error-text fr-fieldset__element" id={errorId("type")}>{errors.type}</p>
  {/if}
</fieldset>

{#if form.type === "personne_physique"}
  {@render textInput("lastName", "Nom")}
  {@render textInput("firstNames", "Prénom")}
{:else if form.type === "personne_morale"}
  {@render textInput(
    "siret",
    "Numéro de SIRET",
    "Format attendu : 14 chiffres. Exemple : 500 001 234 56789",
  )}
{/if}
