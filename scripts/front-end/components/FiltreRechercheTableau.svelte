<script>
    //@ts-check

    import { createEventDispatcher } from "svelte";

    /** @type {string} */
    export let titre

    $: currentValeur = ""
    $: isOpened = false

    const dispatch = createEventDispatcher()
    
    function onMettreÀJourValeurSélectionnée(e) {
        e.preventDefault()
        isOpened = false
        dispatch("selected-changed", currentValeur)
        currentValeur = ""
    }
</script>

<details bind:open={isOpened}>
    <summary class="fr-btn fr-btn--secondary fr-btn--sm">
        {titre}
    </summary>

    <form on:submit={onMettreÀJourValeurSélectionnée} class="filtre-form"> 
        <label class="fr-label" for="text-input-text">{titre}</label>
        <input type="text" bind:value={currentValeur} class="fr-input"/>
    </form>
</details>

<style lang="scss">
    details {
        display: inline;
    }

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
