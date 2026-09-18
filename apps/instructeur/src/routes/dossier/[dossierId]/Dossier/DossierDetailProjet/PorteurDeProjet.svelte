<script lang="ts">
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { FieldChange } from "@pitchou/types/notification.ts";
  import {
    companyPropertyLabels,
    identityPropertyLabels,
    identityTypeLabels,
  } from "@pitchou/types/notification.ts";
  import { entrepriseCreationDate, entrepriseStatus } from "./porteur.ts";
  import CopyIconButton from "../CopyIconButton.svelte";
  import ProjectField from "./ProjectField.svelte";

  let {
    dossier,
    modifiedFields = new Map(),
  }: { dossier: DossierFull; modifiedFields?: Map<string, FieldChange> } = $props();
  type IdentityType = keyof typeof identityTypeLabels;
  type IdentityProperty = keyof typeof identityPropertyLabels;
  const identityProperties = Object.keys(identityPropertyLabels) as IdentityProperty[];
  const companyProperties = Object.keys(
    companyPropertyLabels,
  ) as (keyof typeof companyPropertyLabels)[];
  const identityPrefixes = {
    demandeur: "deposant",
    mandataire: "mandataire",
    representant: "representative",
  } as const;
  const isCompany = $derived(Boolean(dossier.demandeur_personne_morale_siret));
  const legacyChanges = $derived(
    [...modifiedFields.values()].filter(({ field }) =>
      ["Entreprise", ...Object.values(identityTypeLabels)].includes(field),
    ),
  );

  function hasChanges(type: string) {
    return [...modifiedFields.keys()].some((field) => field.startsWith(`${type}.`));
  }

  function identityValue(type: IdentityType, property: IdentityProperty) {
    const value = dossier[`${identityPrefixes[type]}_${property}` as keyof DossierFull] as
      string | null | undefined;
    if (type !== "demandeur" || dossier.source === "demarche_numerique" || isCompany) return value;
    // Native/legacy physical applicants still use their existing person record.
    return (
      (dossier[`demandeur_personne_physique_${property}` as keyof DossierFull] as
        string | null | undefined) ?? value
    );
  }

  function companyValue(property: keyof typeof companyPropertyLabels) {
    if (!isCompany) return null;
    if (property === "address") return dossier.demandeur_address;
    if (property === "creation_date") return entrepriseCreationDate(dossier);
    if (property === "admin_status")
      return entrepriseStatus(dossier) ?? dossier.demandeur_personne_morale_admin_status;
    return dossier[`demandeur_personne_morale_${property}` as keyof DossierFull] as
      string | null | undefined;
  }
</script>

<div class="flex flex-col gap-6">
  {#if isCompany || hasChanges("entreprise")}
    <section aria-label="Entreprise">
      <h4 class="dossier-review-left fr-text--md fr-mb-1w font-bold">L'entreprise</h4>
      {#each companyProperties as property}
        {@const value = companyValue(property)}
        {@const change = modifiedFields.get(`entreprise.${property}`)}
        {#if value || change || (isCompany && ["legal_name", "siret", "legal_form", "naf_label", "admin_status", "creation_date", "address"].includes(property))}
          <ProjectField
            dossierId={dossier.id}
            label={companyPropertyLabels[property]}
            {value}
            {change}
          >
            {#snippet children()}
              <span style="white-space: pre-line">{value || "Non renseigné"}</span>
              {#if property === "address" && value}<CopyIconButton
                  textToCopy={value}
                  label="Copier l'adresse"
                />{/if}
            {/snippet}
          </ProjectField>
        {/if}
      {/each}
    </section>
  {/if}

  {#each ["representant", "demandeur", "mandataire"] as kind}
    {@const type = kind as IdentityType}
    {#if type === "demandeur" || (type === "representant" && isCompany) || hasChanges(type) || identityProperties.some( (property) => identityValue(type, property) )}
      <section aria-label={identityTypeLabels[type]}>
        <h4 class="dossier-review-left fr-text--md fr-mb-1w font-bold">
          {type === "representant"
            ? "Le représentant"
            : type === "demandeur"
              ? "Le demandeur"
              : "Le mandataire"}
        </h4>
        {#if type === "demandeur" && !isCompany}<p
            class="dossier-review-left fr-badge fr-badge--info fr-badge--no-icon fr-mb-1w"
          >
            Personne physique
          </p>{/if}
        {#each identityProperties as property}
          {@const value = identityValue(type, property)}
          {@const change = modifiedFields.get(`${type}.${property}`)}
          {#if value || change || ["first_names", "last_name", "email"].includes(property)}
            <ProjectField
              dossierId={dossier.id}
              label={identityPropertyLabels[property]}
              {value}
              {change}
            >
              {#snippet children()}
                {#if value && property === "email"}<a class="fr-link" href={`mailto:${value}`}
                    >{value}</a
                  >
                {:else if value && property === "phone"}<a class="fr-link" href={`tel:${value}`}
                    >{value}</a
                  >
                {:else}{value || "Non renseigné"}{/if}
              {/snippet}
            </ProjectField>
          {/if}
        {/each}
        {#if type === "demandeur" && !isCompany && dossier.demandeur_personne_physique_address}
          <ProjectField
            dossierId={dossier.id}
            label="Adresse"
            value={dossier.demandeur_personne_physique_address}
          />
        {/if}
      </section>
    {/if}
  {/each}

  {#if legacyChanges.length}
    <section aria-label="Modifications antérieures">
      <h4 class="dossier-review-left fr-text--md fr-mb-1w font-bold">Modifications antérieures</h4>
      {#each legacyChanges as change (change.field)}
        <ProjectField
          dossierId={dossier.id}
          label={change.label}
          value="Le détail du champ modifié n'a pas été enregistré dans cet ancien historique."
          {change}
        />
      {/each}
    </section>
  {/if}
</div>
