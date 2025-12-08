<script>
    import Squelette from "../Squelette.svelte"

    /**
    * @typedef {Object} Props
    * @property {string | undefined} [email]
    */

    /** @type {Props} */
    let { email = undefined } = $props();


</script>

<Squelette {email}>
    <h1>Mes dossiers</h1>
    <div class="liste-des-dossiers">
        <ul>
            <li>Carte 1</li>
            <li>Carte 2</li>
            <li>Carte 3</li>
        </ul>
    </div>
</Squelette>

<style>
    .liste-des-dossiers {
        background: var(--background-contrast-grey);
        padding: 1rem;
    }
</style>