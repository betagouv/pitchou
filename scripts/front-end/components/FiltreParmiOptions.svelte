<script>
    //@ts-check

    /** @type {Set<string>}*/
    export let options  

    /** @type {string} */
    export let titre

    /** @type {function} */
    export let mettreÀJourOptionsSélectionnées

    /** @type {Set<string>} */
    export let optionsSélectionnées = new Set(options)

    $: optionsAffichées = [...options].map(option => ({option, checked: optionsSélectionnées.has(option)}))

    function rerender() {
        optionsSélectionnées = optionsSélectionnées
    }

    /**
     *
     * @param {string} option
     * @returns 
     */
    function mettreÀJourOption(option) {
        if (optionsSélectionnées.has(option)) {
            optionsSélectionnées.delete(option)
        } else {
            optionsSélectionnées.add(option)
        }

        rerender()
        mettreÀJourOptionsSélectionnées(optionsSélectionnées)
    }

    /**
     * @param {MouseEvent} e
     */
    function selectionnerTout(e){
        optionsSélectionnées = new Set(options)
        mettreÀJourOptionsSélectionnées(optionsSélectionnées)
    }

    /**
     * @param {MouseEvent} e
     */
    function selectionnerRien(e){
        optionsSélectionnées = new Set()
        mettreÀJourOptionsSélectionnées(optionsSélectionnées)
    }

    let open = false;

    /** @type {HTMLElement} */
    let details;

    /**
     * @param {MouseEvent} e
     */
    function detailsOnClick(e){
        // @ts-ignore
        if(!details.contains(e.target)){
            open = false
        }
    }

</script>

<svelte:body on:click={detailsOnClick}/>

<details bind:open bind:this={details}>
    <summary class="fr-btn fr-btn--secondary fr-btn--sm">
        {titre}
    </summary>

    <section class="filtre-options">
        <button class="fr-btn fr-btn--secondary fr-btn--sm" on:click={selectionnerTout}>Sélectionner tout</button>
        <button class="fr-btn fr-btn--secondary fr-btn--sm" on:click={selectionnerRien}>Sélectionner rien</button>

        <ul>

            {#each optionsAffichées as optionAffichée}
                <li>
                    <label>
                        <input 
                            type="checkbox" 
                            bind:checked={optionAffichée.checked}
                            on:input={() => mettreÀJourOption(optionAffichée.option)}
                        />
                        {optionAffichée.option}
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
