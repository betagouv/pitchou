<script>
    import {SvelteSet} from 'svelte/reactivity'

    /**
     * @typedef {Object} Props
     * @property {Set<string>} options
     * @property {string} titre
     * @property {function} mettreÀJourOptionsSélectionnées
     * @property {Set<string>} [optionsSélectionnées]
     */

    /** @type {Props} */
    let {
        options,
        titre,
        mettreÀJourOptionsSélectionnées,
        optionsSélectionnées = new SvelteSet(options)
    } = $props();


    /**
     * @param {string} option
     */
    function mettreÀJourOption(option) {
        if (optionsSélectionnées.has(option)) {
            optionsSélectionnées.delete(option)
        } else {
            optionsSélectionnées.add(option)
        }

        mettreÀJourOptionsSélectionnées(optionsSélectionnées)
    }

    function selectionnerTout(){
        optionsSélectionnées = new Set(options)
        mettreÀJourOptionsSélectionnées(optionsSélectionnées)
    }

    function selectionnerRien(){
        optionsSélectionnées = new Set()
        mettreÀJourOptionsSélectionnées(optionsSélectionnées)
    }

    let open = $state(false);

    /** @type {HTMLElement | undefined} */
    let details = $state();

    /**
     * @param {MouseEvent} e
     */
    function detailsOnClick(e){
        // @ts-ignore
        if(!details?.contains(e.target)){
            open = false
        }
    }

</script>

<svelte:body onclick={detailsOnClick}/>

<details bind:open bind:this={details}>
    <summary class="fr-btn fr-btn--secondary fr-btn--sm">
        {titre}
    </summary>

    <section class="filtre-options">
        <button class="fr-btn fr-btn--secondary fr-btn--sm" onclick={selectionnerTout}>Sélectionner tout</button>
        <button class="fr-btn fr-btn--secondary fr-btn--sm" onclick={selectionnerRien}>Sélectionner rien</button>

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

        ul{
            list-style: none;
        }
    }
</style>
