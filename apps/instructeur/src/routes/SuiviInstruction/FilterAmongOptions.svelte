<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";

  // TODO: replace Set<any> with a generic `<T extends string>`
  type Props = {
    options: Set<any>;
    title: string;
    updateSelectedOptions: (selectedOptions: Set<any>) => void;
    selectedOptions?: Set<any>;
  };

  let {
    options,
    title,
    updateSelectedOptions,
    selectedOptions = new SvelteSet(options),
  }: Props = $props();

  function updateOption(option: string) {
    if (selectedOptions.has(option)) {
      selectedOptions.delete(option);
    } else {
      selectedOptions.add(option);
    }

    updateSelectedOptions(selectedOptions);
  }

  function selectAll() {
    selectedOptions = new Set(options);
    updateSelectedOptions(selectedOptions);
  }

  function selectNone() {
    selectedOptions = new Set();
    updateSelectedOptions(selectedOptions);
  }

  let open = $state(false);

  let details: HTMLElement | undefined = $state();

  function detailsOnClick(e: MouseEvent) {
    if (!details?.contains(e.target as Node)) {
      open = false;
    }
  }
</script>

<svelte:body onclick={detailsOnClick} />

<details class="inline fr-mr-1w" bind:open bind:this={details}>
  <summary class="fr-btn fr-btn--secondary fr-btn--sm">
    {title}
  </summary>

  <section
    class="fr-mt-1w fr-p-2w bg-[var(--background-contrast-grey)] border border-[color:var(--border-default-grey)] absolute z-[2]"
  >
    <button class="fr-btn fr-btn--secondary fr-btn--sm" onclick={selectAll}
      >Sélectionner tout</button
    >
    <button class="fr-btn fr-btn--secondary fr-btn--sm" onclick={selectNone}
      >Sélectionner rien</button
    >

    <ul class="list-none">
      {#each options as option}
        <li>
          <label>
            <input
              type="checkbox"
              checked={selectedOptions.has(option)}
              oninput={() => updateOption(option)}
            />
            {option}
          </label>
        </li>
      {/each}
    </ul>
  </section>
</details>
