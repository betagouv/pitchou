<script lang="ts">
  import MultiSelectFilter from "@pitchou/ui/MultiSelectFilter.svelte";
  import { scientifiqueCaptureModeOptions } from "@pitchou/common/dossierFormOptions.ts";

  type Props = { value: string[]; onChange: (value: string[]) => void };
  let { value, onChange }: Props = $props();

  const OTHER = "__other__";
  const standardModes = new Set<string>(scientifiqueCaptureModeOptions);
  const options = [
    ...scientifiqueCaptureModeOptions.map((mode) => ({ value: mode, label: mode })),
    { value: OTHER, label: "Autre moyen" },
  ];
  const customModes = $derived(value.filter((mode) => !standardModes.has(mode)));
  const selected = $derived([
    ...value.filter((mode) => standardModes.has(mode)),
    ...(customModes.length > 0 ? [OTHER] : []),
  ]);

  function changeSelection(selection: string[]) {
    const standard = selection.filter((mode) => standardModes.has(mode));
    const custom = selection.includes(OTHER) ? (customModes.length ? customModes : [""]) : [];
    onChange([...standard, ...custom]);
  }

  function updateCustom(index: number, nextValue: string) {
    let current = -1;
    onChange(
      value.map((mode) => {
        if (standardModes.has(mode)) return mode;
        current += 1;
        return current === index ? nextValue : mode;
      }),
    );
  }

  function removeCustom(index: number) {
    let current = -1;
    onChange(
      value.filter((mode) => {
        if (standardModes.has(mode)) return true;
        current += 1;
        return current !== index;
      }),
    );
  }
</script>

<div class="fr-select-group w-full">
  <label class="fr-label" for="edit-scientifique-capture-mode">Moyens de capture</label>
  <MultiSelectFilter
    id="edit-scientifique-capture-mode"
    label="Moyens de capture"
    allLabel="Aucun moyen"
    {options}
    {selected}
    onChange={changeSelection}
  />
</div>
{#each customModes as mode, index (index)}
  <div class="flex gap-3 items-end fr-mt-2w">
    <div class="fr-input-group fr-mb-0 grow">
      <label class="fr-label" for={`edit-scientifique-capture-other-${index}`}>Autre moyen</label>
      <input
        class="fr-input"
        id={`edit-scientifique-capture-other-${index}`}
        type="text"
        value={mode}
        oninput={(event) => updateCustom(index, event.currentTarget.value)}
      />
    </div>
    <button
      type="button"
      class="fr-btn fr-btn--tertiary-no-outline fr-icon-delete-line"
      aria-label="Retirer cet autre moyen"
      onclick={() => removeCustom(index)}
    ></button>
  </div>
{/each}
{#if customModes.length > 0}
  <button
    type="button"
    class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-add-line fr-btn--icon-left fr-mt-1w"
    onclick={() => onChange([...value, ""])}>Ajouter un autre moyen</button
  >
{/if}
