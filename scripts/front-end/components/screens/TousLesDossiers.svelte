<script>
    import Squelette from "../Squelette.svelte"
    import CarteDossier from "../CarteDossier.svelte"
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
            <li><CarteDossier /></li>
            <li><CarteDossier /></li>
        </ul>
    </div>
</Squelette>

<style>
    .liste-des-dossiers {
        background: var(--background-contrast-grey);
        padding: 1rem;
    }

    ul {
        list-style: none;
    }

    li:not(:last-child) {
      margin-bottom: 1rem;
    }
</style>