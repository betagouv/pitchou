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
     * @param {string} traitementPhase
     * @returns {DossierPhase}
     */
    function traitementPhaseToDossierPhase(traitementPhase){
        if(traitementPhase === 'en_construction')
            return "Accompagnement amont"
        if(traitementPhase === 'en_instruction')
            return "Instruction"
        if(traitementPhase === 'accepte')
            return "Contrôle"
        if(traitementPhase === 'sans_suite')
            return "Classé sans suite"
        if(traitementPhase === 'refuse')
            return "Obligations terminées"

        throw `Traitement phase non reconnue: ${traitementPhase}`
    }

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

    function trouverDossiersAvecAPPrisEn2024(dossiers){
        return {length: -1}
    }

    $: dossiersAvecAPPrisEn2024 = trouverDossiersAvecAPPrisEn2024(dossiers)

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
