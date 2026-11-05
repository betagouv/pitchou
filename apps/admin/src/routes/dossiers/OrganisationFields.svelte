<script lang="ts">
  import { organisationStatusLabel } from "@pitchou/common/porteurDeProjet.ts";
  import {
    organisationErrors,
    organisationPayload,
    type OrganisationForm,
    type OrganisationField,
  } from "./organisation.ts";
  let {
    organisation,
    showErrors = false,
    disabled = false,
    idPrefix = "organisation",
  }: {
    organisation: OrganisationForm;
    showErrors?: boolean;
    disabled?: boolean;
    idPrefix?: string;
  } = $props();
  const errors = $derived(showErrors ? organisationErrors(organisation) : {});
</script>

<p class="fr-text--sm">
  {organisationStatusLabel({ type: "organisation", ...organisationPayload(organisation) })}
</p>
<p class="fr-hint-text">
  Le SIRET de l'établissement reste à confirmer. Pour rattacher un établissement, sélectionnez «
  Personne morale avec SIRET » et renseignez son SIRET.
</p>

{#snippet textField(
  field: Exclude<OrganisationField, "verification_status">,
  label: string,
  required = false,
)}
  <div class="fr-input-group" class:fr-input-group--error={errors[field]}>
    <label class="fr-label" for={`${idPrefix}-${field}`}>{label}{required ? " *" : ""}</label>
    <input
      class="fr-input"
      id={`${idPrefix}-${field}`}
      {disabled}
      {required}
      inputmode={field === "siren" ? "numeric" : undefined}
      aria-invalid={errors[field] ? true : undefined}
      aria-describedby={errors[field] ? `${idPrefix}-${field}-error` : undefined}
      bind:value={organisation[field]}
    />
    {#if errors[field]}<p class="fr-error-text" id={`${idPrefix}-${field}-error`}>
        {errors[field]}
      </p>{/if}
  </div>
{/snippet}

{@render textField("name", "Nom de l'organisation", true)}
{@render textField("address", "Adresse de l'organisation")}
{@render textField("source", "Source", true)}
{@render textField("source_reference", "Référence dans la source", true)}
<div class="fr-select-group">
  <label class="fr-label" for={`${idPrefix}-verification_status`}
    >Vérification de l'organisation</label
  >
  <select
    class="fr-select"
    id={`${idPrefix}-verification_status`}
    {disabled}
    bind:value={organisation.verification_status}
  >
    <option value="source_declared">Déclarée dans la source, à vérifier</option>
    <option value="verified">Organisation vérifiée, établissement à confirmer</option>
  </select>
</div>
{#if organisation.verification_status === "verified"}
  {@render textField("verification_evidence", "Justificatif de vérification", true)}
  {@render textField("siren", "SIREN de l'organisation")}
{/if}
