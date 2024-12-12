<script>
    //@ts-check
    import Squelette from '../Squelette.svelte'
    import {phases, prochaineActionAttenduePar} from '../../affichageDossier.js'

    /** @import {DossierComplet, DossierPhase} from '../../../types.js' */
    /** @import {PitchouState} from '../../store.js' */

    /** @type {DossierComplet[]} */
    export let dossiers = []

    /** @type {PitchouState['relationSuivis']} */
    export let relationSuivis

    /** @type {any[]} */
    export let évènementsPhaseDossier
    $: console.log('évènementsPhaseDossier', évènementsPhaseDossier)




    /**
     * 
     * @return {Map<DossierComplet['id'], DossierPhase>} 
     */
    function créerPhaseParDossierId(évènementsPhaseDossier){
        /** @type {Map<DossierComplet['id'], any>} */
        const evParDossierId = new Map()

        for(const évènement of évènementsPhaseDossier){
            const {dossier, horodatage} = évènement
            
            const horoDate = new Date(horodatage)

            const evPourCeDossier = evParDossierId.get(dossier)

            if(evPourCeDossier === undefined || new Date(evPourCeDossier.horodatage).getTime() < horoDate.getTime() ){
                evParDossierId.set(dossier, évènement)
            }
        }

        return new Map(
            [...evParDossierId.entries()].map(([dossierId, ev]) => [
                dossierId,
                traitementPhaseToDossierPhase(ev.phase)
            ])
        )

    }

    $: phaseParDossierId = créerPhaseParDossierId(évènementsPhaseDossier)


    /** @type {string | undefined} */
    export let email

    function trouverDossiersEnContrôle(dossiers){
        return dossiers.filter(dossier => {
            const id = dossier.id
            const phase = phaseParDossierId.get(id)
            return phase === 'Contrôle'
        })
    }

    $: dossierEnPhaseContrôle = trouverDossiersEnContrôle(dossiers)


    function trouverDossiersAvecAPPrisEn2024(dossiers){
        return dossiers.filter(d => {
            const historique_date_signature_arrêté_préfectoral = d.historique_date_signature_arrêté_préfectoral

            if(!historique_date_signature_arrêté_préfectoral)
                return true // vrai uniquement parce qu'on est en 2024 à l'écrture du code

            return new Date(historique_date_signature_arrêté_préfectoral).getFullYear() === 2024
        })
    }

    $: dossiersAvecAPPrisEn2024 = trouverDossiersAvecAPPrisEn2024(dossierEnPhaseContrôle)

    function trouverDossiersEnAccompagnement(dossiers){
        return dossiers.filter(dossier => {
            const id = dossier.id
            const phase = phaseParDossierId.get(id)
            return phase === 'Accompagnement amont'
        })
    }

    $: dossiersEnAccompagnement = trouverDossiersEnAccompagnement(dossiers)
    
    function trouverDossiersDeMoinsDe3Ans(dossiers){
        return dossiers.filter(d => {
            const dateDépôt = new Date(d.historique_date_réception_ddep || d.date_dépôt)

            return dateDépôt.getFullYear() >= 2022
        })
    }

    $: dossiersEnAccompagnementDeMoinsDe3Ans = trouverDossiersDeMoinsDe3Ans(dossiersEnAccompagnement)

    
    function trouverDossiersNonScientifiques(dossiers){
        return dossiers.filter(d => {
            return d.activité_principale !== 'Demande à caractère scientifique'
        })
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
                <h2>Dossiers avec AP</h2>
                <ul>
                    <li><strong>
                        Nombre de dossiers avec AP (<code>DS: 'accepté'</code>)
                        </strong>&nbsp;: {dossierEnPhaseContrôle.length}
                    </li>
                    <li><strong>
                        Nombre de dossiers avec AP (<code>DS: 'accepté'</code>) pris en 2024
                        </strong>&nbsp;: {dossiersAvecAPPrisEn2024.length}
                    </li>
                </ul>
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
