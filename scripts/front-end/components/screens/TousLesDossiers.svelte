<script>
    /** @import { DossierRésumé } from '../../../types/API_Pitchou.ts' */
    import Squelette from "../Squelette.svelte"
    import CarteDossier from "../CarteDossier.svelte"

    /**
    * @typedef {Object} Props
    * @property {string | undefined} [email]
    * @property {DossierRésumé[]} [dossiers]
    */
    /** @type {Props} */
    let { 
            email = undefined,
            dossiers,
        } = $props();
        
</script>

<Squelette {email}>
    <h1>Mes dossiers</h1>
    <div class="liste-des-dossiers">
        {#each dossiers as dossier}
            <ul>
                <li><CarteDossier {dossier} /></li>
            </ul>
        {/each}
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