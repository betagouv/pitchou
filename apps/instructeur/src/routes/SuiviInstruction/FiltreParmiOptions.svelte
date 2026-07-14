<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";

  // TODO: replace Set<any> with a generic `<T extends string>`
  type Props = {
    options: Set<any>;
    titre: string;
    mettreÀJourOptionsSélectionnées: (optionsSelectionnees: Set<any>) => void;
    optionsSélectionnées?: Set<any>;
  };

  let {
    options,
    titre,
    mettreÀJourOptionsSélectionnées: mettreAJourOptionsSelectionnees,
    optionsSélectionnées: optionsSelectionnees = new SvelteSet(options),
  }: Props = $props();

  function mettreAJourOption(option: string) {
    if (optionsSelectionnees.has(option)) {
      optionsSelectionnees.delete(option);
    } else {
      optionsSelectionnees.add(option);
    }

    mettreAJourOptionsSelectionnees(optionsSelectionnees);
  }

  function selectionnerTout() {
    optionsSelectionnees = new Set(options);
    mettreAJourOptionsSelectionnees(optionsSelectionnees);
  }

  function selectionnerRien() {
    optionsSelectionnees = new Set();
    mettreAJourOptionsSelectionnees(optionsSelectionnees);
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
    {titre}
  </summary>

  <section class="filtre-options">
    <button class="fr-btn fr-btn--secondary fr-btn--sm" onclick={selectionnerTout}
      >Sélectionner tout</button
    >
    <button class="fr-btn fr-btn--secondary fr-btn--sm" onclick={selectionnerRien}
      >Sélectionner rien</button
    >

    <ul>
      {#each options as option}
        <li>
          <label>
            <input
              type="checkbox"
              checked={optionsSelectionnees.has(option)}
              oninput={() => mettreAJourOption(option)}
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
