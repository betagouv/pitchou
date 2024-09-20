<script>
    //@ts-check

    import { createEventDispatcher } from "svelte";

    /** @type {string} */
    export let titre

    $: valeur = ""
    $: isOpen = false

    /** @type {HTMLInputElement} */
    let inputElement

    $: if(isOpen) inputElement.focus()

    const dispatch = createEventDispatcher()
    
    /**
     * 
     * @param {SubmitEvent} e
     */
    function onMettreÀJourValeurSélectionnée(e) {
        e.preventDefault()
        isOpen = false
        dispatch("selected-changed", valeur)
        valeur = ""
    }
</script>

<details bind:open={isOpen}>
    <summary class="fr-btn fr-btn--secondary fr-btn--sm">
        {titre}
    </summary>

    <form on:submit={onMettreÀJourValeurSélectionnée} class="filtre-form"> 
        <label class="fr-label" for="text-input-text">{titre}</label>
        <input class="fr-input fr-mb-2v" type="text" bind:value={valeur} bind:this={inputElement}/>
        <button class="fr-btn fr-btn fr-btn--sm" type="submit">Chercher</button>
    </form>
</details>

<style lang="scss">
    details {
        display: inline;
    }

    .filtre-form {
        margin-top: 0.5rem;
        padding: 1rem;
        background-color: var(--background-contrast-grey);
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
