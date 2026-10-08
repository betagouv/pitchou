<script lang="ts">
  import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
  import type { FieldChange } from "@pitchou/types/notification.ts";
  import type { PorteurDeProjet } from "@pitchou/types/porteurDeProjet.ts";
  import { porteurDeProjetName } from "$lib/dossier/displayDossier.ts";
  import { porteurDeProjetGroups } from "./porteur.ts";
  import CopyIconButton from "../CopyIconButton.svelte";
  import ProjectField from "./ProjectField.svelte";

  let {
    dossierId,
    porteur,
    modifiedFields,
  }: {
    dossierId: DossierId;
    porteur: PorteurDeProjet | null;
    modifiedFields: Map<string, FieldChange>;
  } = $props();
  const groups = $derived(porteur ? porteurDeProjetGroups(porteur) : []);
</script>

<section aria-label="Porteur de projet">
  <div class="dossier-review-left flex flex-wrap items-center gap-x-3 gap-y-1 fr-mb-2w">
    <h4 class="fr-text--lg fr-mb-0 font-bold">
      {(porteur && porteurDeProjetName(porteur)) || "Non renseigné"}
    </h4>
    {#if porteur}
      <p class="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon fr-mb-0">
        {porteur.type === "personne_morale" ? "Personne morale" : "Personne physique"}
      </p>
    {/if}
  </div>
  {#each groups as group (group.title)}
    <h5 class="dossier-review-left group-title fr-text--sm fr-mt-2w fr-mb-1w">{group.title}</h5>
    {#each group.rows as row (row.changeKey)}
      <ProjectField
        {dossierId}
        layout="grid"
        label={row.label}
        value={row.value}
        change={modifiedFields.get(row.changeKey)}
      >
        {#snippet children()}
          <div class="field-content">
            {#if !row.value}<span class="fr-text-mention--grey">Non renseigné</span>
            {:else if row.kind === "email"}<a class="fr-link" href={`mailto:${row.value}`}
                >{row.value}</a
              >
            {:else if row.kind === "phone"}<a class="fr-link" href={`tel:${row.value}`}
                >{row.value}</a
              >
            {:else if row.kind === "status"}<span
                class="fr-badge fr-badge--sm fr-badge--no-icon"
                class:fr-badge--success={row.value === "En activité"}
                class:fr-badge--error={row.value === "Fermé"}>{row.value}</span
              >
            {:else if row.kind === "address"}<span class="address">{row.value}</span>
              <CopyIconButton textToCopy={row.value} label="Copier l'adresse" />
            {:else}{row.value}{/if}
          </div>
        {/snippet}
      </ProjectField>
    {/each}
  {/each}
</section>

<style>
  .group-title {
    color: var(--text-mention-grey);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .address {
    white-space: pre-line;
  }
</style>
