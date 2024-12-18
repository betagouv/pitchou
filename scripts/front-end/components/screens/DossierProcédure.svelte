<script>
    //@ts-check

    import Squelette from '../Squelette.svelte'
    import TagPhase from '../TagPhase.svelte'

    /** @import {DossierComplet} from '../../../types/API_Pitchou.d.ts' */    
    /** @import {default as ÉvènementPhaseDossier} from '../../../types/database/public/ÉvènementPhaseDossier.ts' */


    /** @type {DossierComplet & {évènementsPhase: ÉvènementPhaseDossier[]}} */
    export let dossier

    /** @type {string | undefined} */
    export let email


</script>

<Squelette {email}>
    <div class="fr-grid-row fr-mt-4w">
        <div class="fr-col">
            <h1 class="fr-mb-6w">Procédure dossier {dossier.nom_dossier || "sans nom"}</h1>

            <article class="fr-p-3w fr-mb-4w">
                <ol>
                {#each dossier.évènementsPhase as {phase, horodatage}}
                    <li>
                        <TagPhase phase={phase}></TagPhase>
                        - 
                        {horodatage}
                    </li>    
                {/each}
                </ol>
            </article>
        </div>
    </div>
</Squelette>

<style lang="scss">
    article {
        background-color: var(--background-alt-grey);

        pre{
            white-space: pre-wrap;
        }
    }


</style>
