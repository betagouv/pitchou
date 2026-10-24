<script lang="ts">
  import Select from "@pitchou/ui/Select.svelte";
  import {
    filterOperators,
    needsFilterValue,
    type SourceFilter,
  } from "@pitchou/common/onagre/filters.ts";
  let {
    filter = $bindable(),
    columns,
    index,
    onRemove,
  }: {
    filter: SourceFilter;
    columns: string[];
    index: number;
    onRemove: () => void;
  } = $props();
</script>

<div class="dump-filter-row" role="group" aria-label={`Filtre ${index + 1}`}>
  <div class="onagre-field">
    <label class="sr-only" for={`filter-column-${index}`}>Colonne du filtre {index + 1}</label>
    <Select
      id={`filter-column-${index}`}
      options={columns.map((value) => ({ value, label: value }))}
      bind:value={filter.column}
    />
  </div>
  <div class="onagre-field">
    <label class="sr-only" for={`filter-operator-${index}`}>Condition du filtre {index + 1}</label>
    <Select
      id={`filter-operator-${index}`}
      options={filterOperators.map((option) => ({ ...option }))}
      bind:value={filter.operator}
    />
  </div>
  {#if needsFilterValue(filter.operator)}
    <div class="onagre-field">
      <label class="sr-only" for={`filter-value-${index}`}>Valeur du filtre {index + 1}</label>
      <input
        id={`filter-value-${index}`}
        class="fr-input"
        bind:value={filter.value}
        maxlength="200"
        placeholder={["before", "after"].includes(filter.operator)
          ? "AAAA-MM-JJ"
          : "Valeur à comparer"}
      />
    </div>
  {:else}<span class="onagre-context dump-filter-no-value">Aucune valeur à saisir</span>{/if}
  <button
    type="button"
    class="fr-btn fr-btn--secondary"
    aria-label={`Supprimer le filtre ${index + 1}`}
    onclick={onRemove}>Retirer</button
  >
</div>
