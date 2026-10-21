<script lang="ts">
  import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
  import type { DossierActeur, Involvement } from "@pitchou/types/dossierActeur.ts";
  import type { FieldChange as Change } from "@pitchou/types/notification.ts";
  import { acteurBlocks } from "./acteurs.ts";
  import FieldChange from "./FieldChange.svelte";
  import ProjectField from "./ProjectField.svelte";

  let {
    dossierId,
    acteurs,
    modifiedFields,
    porteurInvolvements = [],
  }: {
    dossierId: DossierId;
    acteurs: DossierActeur[];
    modifiedFields: Map<string, Change>;
    porteurInvolvements?: Involvement[];
  } = $props();
  const blocks = $derived(acteurBlocks(acteurs, modifiedFields, porteurInvolvements));
</script>

{#each blocks as block, index (index)}
  <section aria-label={block.title}>
    <h4 class="dossier-review-left fr-text--md fr-mb-1w font-bold">{block.title}</h4>
    {#each block.rows as row (row.property)}
      <ProjectField
        {dossierId}
        layout="grid"
        label={row.label}
        value={row.value}
        change={row.changes[0]}
      >
        {#snippet children()}
          <div>
            {#if !row.value}<span class="fr-text-mention--grey">Non renseigné</span>
            {:else if row.property === "email"}<a class="fr-link" href={`mailto:${row.value}`}
                >{row.value}</a
              >
            {:else if row.property === "phone"}<a class="fr-link" href={`tel:${row.value}`}
                >{row.value}</a
              >
            {:else}<span class="value">{row.value}</span>{/if}
          </div>
        {/snippet}
      </ProjectField>
      {#each row.changes.slice(1) as change (change.field)}
        <div class="dossier-review-row"><span></span><FieldChange {dossierId} {change} /></div>
      {/each}
    {/each}
  </section>
{/each}

<style>
  .value {
    white-space: pre-line;
  }
</style>
