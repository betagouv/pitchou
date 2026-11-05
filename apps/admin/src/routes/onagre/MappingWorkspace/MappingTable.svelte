<script lang="ts">
  import type { ActivityOption } from "@pitchou/types/onagreActivities.ts";
  import type { OnagreMapping } from "@pitchou/types/onagre.ts";
  import { statusLabels } from "../mappings.ts";
  let {
    mappings,
    onSelect,
    activities = [],
  }: {
    mappings: OnagreMapping[];
    onSelect: (key: string) => void;
    activities?: ActivityOption[];
  } = $props();
</script>

<div class="mapping-list" aria-label="Liste des correspondances">
  <div class="mapping-list-head" aria-hidden="true">
    <span>Information Onagre</span><span>Destination Pitchou</span><span>Règle de reprise</span
    ><span>Avancement</span><span></span>
  </div>
  {#each mappings as mapping}
    {@const primaryKey = mapping.relations?.primaryKey ?? []}
    {@const keyLabel = primaryKey.length > 1 ? "Clé primaire composée" : "Clé primaire"}
    <button
      type="button"
      class="mapping-list-row"
      data-mapping-key={mapping.key}
      onclick={() => onSelect(mapping.key)}
      aria-label={`Ouvrir ${mapping.section} · ${mapping.label}${primaryKey.length ? ` · ${keyLabel}` : ""}`}
    >
      <span class="mapping-row-source"
        ><small>{mapping.section} · {mapping.key.startsWith("field:") ? "Champ" : "Valeur"}</small
        ><span class="mapping-field-title"
          ><strong>{mapping.label}</strong>
          {#if primaryKey.length}<span class="mapping-key-badge" title={primaryKey.join(", ")}
              >{keyLabel}</span
            >{/if}
        </span></span
      >
      <span class="mapping-row-target" class:muted={!mapping.target}
        >{activities.find((activity) => activity.code === mapping.activity_code)?.label ||
          mapping.activity_code ||
          mapping.target ||
          "À définir"}</span
      >
      <span class="mapping-row-rule" class:muted={!mapping.rule}>{mapping.rule || "À rédiger"}</span
      >
      <span class="mapping-status" data-status={mapping.status}
        ><span></span>{statusLabels[mapping.status]}</span
      >
      <span class="fr-icon-arrow-right-s-line fr-icon--sm mapping-row-arrow" aria-hidden="true"
      ></span>
    </button>
  {/each}
</div>

<style>
  .mapping-field-title {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem 0.5rem;
  }
  .mapping-key-badge {
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
    line-height: 1.4;
    color: var(--text-action-high-blue-france);
    background: var(--background-action-low-blue-france);
  }
</style>
