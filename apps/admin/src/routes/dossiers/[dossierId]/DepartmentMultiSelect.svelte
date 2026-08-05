<script lang="ts">
  import { departements } from "@pitchou/common/departements.ts";
  import MultiSelectFilter, { type FilterOption } from "@pitchou/ui/MultiSelectFilter.svelte";

  type Props = {
    id: string;
    label: string;
    selected: string[];
    onChange: (value: string[]) => void;
  };
  let { id, label, selected, onChange }: Props = $props();

  const options = $derived.by(() => {
    const knownOptions: FilterOption[] = departements.map(({ code, name }) => ({
      value: code,
      label: `${code} - ${name}`,
    }));
    const knownValues = new Set(knownOptions.map(({ value }) => value));
    return [
      ...knownOptions,
      ...selected
        .filter((value) => !knownValues.has(value))
        .map((value) => ({ value, label: `${value} (valeur historique)` })),
    ];
  });
</script>

<div class="fr-select-group w-full">
  <label class="fr-label" for={id}>{label}</label>
  <MultiSelectFilter
    {id}
    label="Départements"
    allLabel="Aucun département"
    {options}
    {selected}
    {onChange}
  />
</div>
