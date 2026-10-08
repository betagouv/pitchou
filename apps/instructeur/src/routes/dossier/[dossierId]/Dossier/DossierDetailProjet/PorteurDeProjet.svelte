<script lang="ts">
  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { FieldChange } from "@pitchou/types/notification.ts";
  import { identityPropertyLabels, identityTypeLabels } from "@pitchou/types/notification.ts";
  import PorteurDeProjetDetails from "./PorteurDeProjetDetails.svelte";
  import ProjectField from "./ProjectField.svelte";

  let {
    dossier,
    modifiedFields = new Map(),
  }: { dossier: DossierFull; modifiedFields?: Map<string, FieldChange> } = $props();
  type IdentityType = "representant" | "mandataire";
  type IdentityProperty = keyof typeof identityPropertyLabels;
  const identityProperties = Object.keys(identityPropertyLabels) as IdentityProperty[];
  const identityPrefixes = { mandataire: "mandataire", representant: "representative" } as const;
  const porteur = $derived(dossier.porteur_de_projet);
  const legacyChanges = $derived(
    [...modifiedFields.values()].filter(({ field }) =>
      ["Entreprise", ...Object.values(identityTypeLabels)].includes(field),
    ),
  );

  function hasChanges(type: string) {
    return [...modifiedFields.keys()].some((field) => field.startsWith(`${type}.`));
  }

  function identityValue(type: IdentityType, property: IdentityProperty) {
    return dossier[`${identityPrefixes[type]}_${property}` as keyof DossierFull] as
      string | null | undefined;
  }
</script>

{#snippet identityField(
  property: IdentityProperty,
  value: string | null | undefined,
  change: FieldChange | undefined,
)}
  {#if value || change || ["first_names", "last_name", "email"].includes(property)}
    <ProjectField
      dossierId={dossier.id}
      layout="grid"
      label={identityPropertyLabels[property]}
      {value}
      {change}
    >
      {#snippet children()}
        <div>
          {#if value && property === "email"}<a class="fr-link" href={`mailto:${value}`}>{value}</a>
          {:else if value && property === "phone"}<a class="fr-link" href={`tel:${value}`}
              >{value}</a
            >
          {:else if value}{value}
          {:else}<span class="fr-text-mention--grey">Non renseigné</span>{/if}
        </div>
      {/snippet}
    </ProjectField>
  {/if}
{/snippet}

<div class="flex flex-col gap-6">
  <PorteurDeProjetDetails dossierId={dossier.id} {porteur} {modifiedFields} />

  {#each ["representant", "mandataire"] as kind}
    {@const type = kind as IdentityType}
    {#if (type === "representant" && porteur?.type === "personne_morale") || hasChanges(type) || identityProperties.some( (property) => identityValue(type, property) )}
      <section aria-label={identityTypeLabels[type]}>
        <h4 class="dossier-review-left fr-text--md fr-mb-1w font-bold">
          {type === "representant" ? "Le représentant" : "Le mandataire"}
        </h4>
        {#each identityProperties as property}
          {@render identityField(
            property,
            identityValue(type, property),
            modifiedFields.get(`${type}.${property}`),
          )}
        {/each}
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
