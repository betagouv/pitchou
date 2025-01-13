<script>
    //@ts-check

    import Squelette from '../Squelette.svelte'
    import TagPhase from '../TagPhase.svelte'
    import {formatDateRelative, formatDateAbsolue} from '../../affichageDossier.js'

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
            <h1 class="fr-mb-6w">Procédure dossier {dossier.nom || "sans nom"}</h1>

            <article class="fr-p-3w fr-mb-4w">
                <ol>
                {#each dossier.évènementsPhase as {phase, horodatage}}
                    <li>
                        <TagPhase phase={phase}></TagPhase>
                        - 
                        <span title={formatDateAbsolue(horodatage)}>{formatDateRelative(horodatage)}</span>
                    </li>    
                {/each}
                    <li><strong>Dépôt dossier</strong> - <span title={formatDateAbsolue(dossier.date_dépôt)}>{formatDateRelative(dossier.date_dépôt)}</span>
                </ol>
            </article>
        </div>
    </div>
</Squelette>

<style lang="scss">
    article {
        background-color: var(--background-alt-grey);

        ol{
            list-style: none;
            
            li{

                &:first-child{
                    font-size: 1.5em;
                    font-weight: bold;
                    padding: 0.7em 0;
                }

                &::marker{
                    content: none;
                }
            }

        }
    }


</style>
