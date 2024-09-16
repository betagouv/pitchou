<script>
    //@ts-check

    import { createEventDispatcher } from "svelte";

    /** @type {string} */
    export let titre

    let currentOption = ""
    $: optionsSélectionnées = new Set()
    const dispatch = createEventDispatcher()
    
    function rerender() {
        optionsSélectionnées = optionsSélectionnées
    }

    /**
     *
     * @param {string} option
     * @returns 
     */
    function ajouterOption(option) {
        if (optionsSélectionnées.has(option)) {
            optionsSélectionnées.delete(option)
        } else {
            optionsSélectionnées.add(option)
        }

        rerender()
        dispatch("selected-changed", optionsSélectionnées)
    }

    function onAjouterOption(e) {
        e.preventDefault()
        ajouterOption(currentOption)
        currentOption = ""
    }
</script>

<details>
    <summary class="fr-btn fr-btn--secondary fr-btn--sm">
        {titre}
    </summary>

    <form on:submit={onAjouterOption} class="filtre-form"> 
        <label class="fr-label" for="text-input-text">{titre}</label>
        <input type="text" bind:value={currentOption} class="fr-input"/>
    </form>
</details>

<style lang="scss">
    .filtre-form {
        margin-top: 0.5rem;
        padding: 1rem;
        background-color: #fff;
        border: 1px solid var(--border-default-grey);
        position: absolute;
        z-index: 2;
        list-style: none;
        width: 20rem;

        input {
            width: 90%;
        }
    }
</style>
