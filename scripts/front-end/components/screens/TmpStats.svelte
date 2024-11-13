<script>
    //@ts-check
    import Squelette from '../Squelette.svelte'
    import {phases, prochaineActionAttenduePar} from '../../affichageDossier.js'

    /** @import {DossierComplet, DossierPhase, DossierProchaineActionAttenduePar} from '../../../types.js' */
    /** @import {PitchouState} from '../../store.js' */

    /** @type {DossierComplet[]} */
    export let dossiers = []

    /** @type {PitchouState['relationSuivis']} */
    export let relationSuivis

    /** @type {any[]} */
    export let évènementsPhaseDossier

    $: console.log('évènementsPhaseDossier', évènementsPhaseDossier)

    /** @type {string | undefined} */
    export let email

    function trouverDossiersAvecAPPrisEn2024(dossiers){
        return {length: -1}
    }

    $: dossiersAvecAPPrisEn2024 = trouverDossiersAvecAPPrisEn2024(dossiers)

    function trouverDossiersEnAccompagnement(dossiers){
        return {length: -1}
    }

    $: dossiersEnAccompagnement = trouverDossiersEnAccompagnement(dossiers)
    
    function trouverDossiersDeMoinsDe3Ans(dossiers){
        return {length: -1}
    }

    $: dossiersEnAccompagnementDeMoinsDe3Ans = trouverDossiersDeMoinsDe3Ans(dossiersEnAccompagnement)

    
    function trouverDossiersNonScientifiques(dossiers){
        return {length: -1}
    }

    $: dossiersNonScientifiquesEnAccompagnementDeMoinsDe3Ans = trouverDossiersNonScientifiques(dossiersEnAccompagnementDeMoinsDe3Ans)
</script>

<Squelette nav={false} {email}>
    <div class="fr-grid-row fr-mt-6w fr-grid-row--center">
        <article class="fr-col">
            <header class="fr-mb-2w">
                <h1>Des stats pour les chefs DREAL N-A</h1>
                <p>Page très temporaire</p>
            </header>

            <section>
                <h2 class="fr-mt-2w">Nombre de dossiers&nbsp;: {dossiers.length} dossiers affichés</h2>
            </section>

            <section>
                <strong>Nombre d'AP pris en 2024</strong>&nbsp;: {dossiersAvecAPPrisEn2024.length}
            </section>

            <section>
                <h2>Accompagnement</h2>
                <ul>
                    <li><strong>
                        Nombre de dossiers actuellement en accompagnement 
                        (<code>DS: 'en construction'</code>)
                        </strong>&nbsp;: {dossiersEnAccompagnement.length}
                    </li>
                    <li><strong>
                        Nombre de dossiers actuellement en accompagnement 
                        (<code>DS: 'en construction'</code>) qui ont moins de 3 ans
                        </strong>&nbsp;: {dossiersEnAccompagnementDeMoinsDe3Ans.length}
                    </li>
                    <li><strong>
                        Nombre de dossiers non-scientifiques actuellement en accompagnement 
                        (<code>DS: 'en construction'</code>) qui ont moins de 3 ans
                        </strong>&nbsp;: {dossiersNonScientifiquesEnAccompagnementDeMoinsDe3Ans.length}
                    </li>
                </ul>
            </section>
        </article>
    </div>
</Squelette>

<style lang="scss">
    td, th{
        vertical-align: top;
    }

    th {
        min-width: 6rem;
    }
</style>
