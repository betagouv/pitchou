<script>
    //@ts-check

    import { createEventDispatcher } from "svelte";

    /** @import {FormEventHandler} from "svelte/elements" */

    /** @type {Set<string>}*/
    export let options  

    /** @type {string} */
    export let titre

    let optionsSélectionnées = new Set(options)
    const dispatch = createEventDispatcher()

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
        dispatch("selected-changed", optionsSélectionnées)
    }
</script>

<details>
    <summary class="fr-btn fr-btn--secondary fr-btn--sm">
        {titre}
    </summary>

    <ul class="filtre-options">
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
</details>

<style lang="scss">
    details {
        display: inline;
    }

    .filtre-options {
        margin-top: 0.5rem;
        padding: 1rem;
        background-color: var(--background-contrast-grey);
        border: 1px solid var(--border-default-grey);
        position: absolute;
        z-index: 2;
        list-style: none;
    }
</style>
