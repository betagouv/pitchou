<script lang="ts">
  import type { OnagreMapping, MappingStatus } from "@pitchou/types/onagre.ts";
  import Select from "@pitchou/ui/Select.svelte";
  import { statusLabels } from "../mappings.ts";
  let {
    search,
    status,
    kind,
    matches,
    onChange,
  }: {
    search: string;
    status: string;
    kind: string;
    matches: OnagreMapping[];
    onChange: (changes: Record<string, string | null>) => void;
  } = $props();
</script>

<div class="mapping-searchbar">
  <label class="mapping-search" for="mapping-search"
    ><span class="fr-icon-search-line fr-icon--sm" aria-hidden="true"></span><input
      id="mapping-search"
      type="search"
      class="fr-input"
      aria-label="Rechercher une correspondance"
      placeholder="Champ, proposition, destination, notes…"
      bind:value={search}
      oninput={(event) => onChange({ mappingSearch: event.currentTarget.value })}
    /></label
  >
  <Select
    id="mapping-kind"
    ariaLabel="Type de correspondance"
    value={kind}
    onChange={(value) => onChange({ mappingKind: value })}
    options={[
      { value: "", label: "Toutes les correspondances" },
      { value: "field", label: "Champs de la base" },
      { value: "reference", label: "Valeurs de référence" },
      { value: "proposal", label: "Avec une proposition" },
    ]}
  />
</div>
<div class="mapping-status-filters" role="group" aria-label="Filtrer par avancement">
  {#each [["", "Toutes"], ...Object.entries(statusLabels)] as [value, label]}<button
      type="button"
      aria-pressed={status === value}
      onclick={() => onChange({ mappingStatus: value })}
      >{label}<span
        >{value
          ? matches.filter((m) => m.status === (value as MappingStatus)).length
          : matches.length}</span
      ></button
    >{/each}
  {#if search || status || kind}<button
      type="button"
      class="mapping-clear"
      onclick={() => onChange({ mappingSearch: null, mappingStatus: null, mappingKind: null })}
      >Effacer les filtres</button
    >{/if}
</div>
