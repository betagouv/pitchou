<script>
    //@ts-check

    import Squelette from '../Squelette.svelte'
    //import TagPhase from '../TagPhase.svelte'
    import EnteteDossier from '../Dossier/EnteteDossier.svelte'
    import DossierTabs from '../Dossier/DossierTabs.svelte'
    

    /** @import {DossierComplet, DossierPhase} from '../../../types/API_Pitchou.ts' */

    /** @type {DossierComplet} */
    export let dossier

    export let messages

    /** @type {string | undefined} */
    export let email = undefined
    
</script>

<Squelette {email}>
    <div class="fr-grid-row fr-mt-4w">
        <div class="fr-col">
            <EnteteDossier {dossier}></EnteteDossier>
            <DossierTabs {dossier} {messages}></DossierTabs>
        </div>
    </div>
</Squelette>

<style lang="scss">
    article {
        background-color: var(--background-alt-grey);
    }

    section {
        margin-bottom: 3rem;
    }

    select {
        max-width: 90%;
    }

    .liste-espèces{
        max-width: 40rem;
        overflow: hidden;
        white-space: nowrap;
    }

    nav.dossier-nav {
        display: flex;
        flex-direction: column;
    }
</style>
