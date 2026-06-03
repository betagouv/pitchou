<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";

  // TODO: remplacer Set<any> par un générique `<T extends string>`
  type Props = {
    options: Set<any>;
    titre: string;
    mettreÀJourOptionsSélectionnées: (optionsSélectionnées: Set<any>) => void;
    optionsSélectionnées?: Set<any>;
  };

  let {
    options,
    titre,
    mettreÀJourOptionsSélectionnées,
    optionsSélectionnées = new SvelteSet(options),
  }: Props = $props();

  function mettreÀJourOption(option: string) {
    if (optionsSélectionnées.has(option)) {
      optionsSélectionnées.delete(option);
    } else {
      optionsSélectionnées.add(option);
    }

    mettreÀJourOptionsSélectionnées(optionsSélectionnées);
  }

  function selectionnerTout() {
    optionsSélectionnées = new Set(options);
    mettreÀJourOptionsSélectionnées(optionsSélectionnées);
  }

  function selectionnerRien() {
    optionsSélectionnées = new Set();
    mettreÀJourOptionsSélectionnées(optionsSélectionnées);
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
              checked={optionsSélectionnées.has(option)}
              oninput={() => mettreÀJourOption(option)}
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
