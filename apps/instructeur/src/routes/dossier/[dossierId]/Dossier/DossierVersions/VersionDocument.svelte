<script lang="ts">
  import type {
    ComparisonSection,
    DemandeComparisonDocument,
  } from "@pitchou/types/demandeComparison.ts";
  import ComparisonValue from "./ComparisonValue.svelte";
  let { document }: { document: DemandeComparisonDocument } = $props();
</script>

{#snippet sections(items: ComparisonSection[])}
  {#each items as section (section.key)}
    <details
      class="fr-p-2w fr-mb-2w rounded-lg border border-[var(--border-default-grey)]"
      open={section.key === "demande"}
    >
      <summary class="cursor-pointer font-bold">{section.label}</summary>
      {#if section.records.length === 0}<p>Aucun élément</p>{/if}
      {#each section.records as record}
        <div class="fr-mt-2w">
          <p class="font-bold fr-mb-1w">{record.label}</p>
          <dl>
            {#each record.fields as field (field.key)}
              <div
                class="grid gap-1 border-b border-[var(--border-default-grey)] py-3 sm:grid-cols-[minmax(12rem,1fr)_2fr] sm:gap-6"
              >
                <dt class="text-[var(--text-mention-grey)]">{field.label}</dt>
                <dd class="fr-ml-0"><ComparisonValue value={field.value} /></dd>
              </div>
            {/each}
          </dl>
          {#if record.sections}{@render sections(record.sections)}{/if}
        </div>
      {/each}
    </details>
  {/each}
{/snippet}

{@render sections(document.sections)}
