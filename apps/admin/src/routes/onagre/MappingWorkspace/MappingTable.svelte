<script lang="ts">
  import type { OnagreMapping } from "@pitchou/types/onagre.ts";
  import { statusLabels } from "../mappings.ts";
  let { mappings, onSelect }: { mappings: OnagreMapping[]; onSelect: (key: string) => void } =
    $props();
</script>

<div class="mapping-list" aria-label="Liste des correspondances">
  <div class="mapping-list-head" aria-hidden="true">
    <span>Information Onagre</span><span>Proposition de l'équipe</span><span
      >Destination Pitchou</span
    ><span>Avancement</span><span></span>
  </div>
  {#each mappings as mapping}
    <button
      type="button"
      class="mapping-list-row"
      data-mapping-key={mapping.key}
      onclick={() => onSelect(mapping.key)}
      aria-label={`Ouvrir ${mapping.section} · ${mapping.label}`}
    >
      <span class="mapping-row-source"
        ><small>{mapping.section} · {mapping.key.startsWith("field:") ? "Champ" : "Valeur"}</small
        ><strong>{mapping.label}</strong></span
      >
      <span class="mapping-row-proposal" class:muted={!mapping.proposal}
        >{mapping.proposal || "À définir"}</span
      >
      <span class="mapping-row-target" class:muted={!mapping.target}
        >{mapping.target || "À définir"}</span
      >
      <span class="mapping-status" data-status={mapping.status}
        ><span></span>{statusLabels[mapping.status]}</span
      >
      <span class="fr-icon-arrow-right-s-line fr-icon--sm mapping-row-arrow" aria-hidden="true"
      ></span>
    </button>
  {/each}
</div>
