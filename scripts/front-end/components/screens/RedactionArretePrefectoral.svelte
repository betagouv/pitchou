<script>
    //@ts-check

    import Squelette from '../Squelette.svelte'
    import NomEspèce from '../NomEspèce.svelte'
    import Loader from '../Loader.svelte'
    import EnteteDossier from '../Dossier/EnteteDossier.svelte'
    

    /** @import {DossierComplet} from '../../../types/API_Pitchou.ts' */
    /** @import { DescriptionMenacesEspèces } from '../../../types/especes.d.ts' **/

    /** @type {DossierComplet} */
    export let dossier

    /** @type {string | undefined} */
    export let email = undefined

    /** @type {Promise<DescriptionMenacesEspèces | undefined>} */
    export let espècesImpactées

    

</script>

<Squelette {email}>
    <div class="fr-grid-row fr-mt-6w">
        <div class="fr-col">
            <EnteteDossier {dossier}></EnteteDossier>
            
            <h2 class="fr-mb-8w">Aide à la Rédaction arrêté préfectoral</h2>

            <article class="fr-p-3w fr-mb-4w">
                
            </article>
        </div>
    </div>
</Squelette>

<style lang="scss">
    article {
        background-color: var(--background-alt-grey);

        & > section {
            margin-bottom: 2rem;
        }
    }

    section.liste-especes {
        margin-bottom: 2rem;
    }
</style>
