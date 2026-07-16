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

<details bind:open bind:this={details}>
  <summary class="fr-btn fr-btn--secondary fr-btn--sm">
    {title}
  </summary>

  <section class="filtre-options">
    <button class="fr-btn fr-btn--secondary fr-btn--sm" onclick={selectAll}
      >Sélectionner tout</button
    >
    <button class="fr-btn fr-btn--secondary fr-btn--sm" onclick={selectNone}
      >Sélectionner rien</button
    >

    <ul>
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

<style lang="scss">
  details {
    display: inline;
    margin-right: 0.5rem;
  }

  .filtre-options {
    margin-top: 0.5rem;
    padding: 1rem;
    background-color: var(--background-contrast-grey);
    border: 1px solid var(--border-default-grey);
    position: absolute;
    z-index: 2;

    ul {
      list-style: none;
    }
  }
</style>
