<script>
    import { endOfYear, getYear, isAfter, isBefore, startOfYear, sub } from 'date-fns';
    //@ts-nocheck
    /*
        Notes pour la prochaine itération

        Résoudre les issues suivantes si ça n'a pas encore été fait :
        - https://github.com/betagouv/pitchou/issues/157

    */

    import Squelette from '../Squelette.svelte'
    import TagPhase from '../TagPhase.svelte'

    /** @import {DossierRésumé} from '../../../types/API_Pitchou.ts' */ 

    /** @type {DossierRésumé[]} */
    export let dossiers = []


    /** @type {string | undefined} */
    export let email = undefined

   const aujourdhui = new Date()

    /**
     * 
     * @param {DossierRésumé[]} dossiers 
     */
    function trouverDossiersEnContrôle(dossiers){
        return dossiers.filter(dossier => dossier.phase === 'Contrôle')
    }

    $: dossierEnPhaseContrôle = trouverDossiersEnContrôle(dossiers)

    /**
     * 
     * @param {DossierRésumé[]} dossiers
     * @param {Date} dateDebut
     * @param {Date | undefined} dateFin
     */
    function trouverDossiersAvecAPPrisDepuis(dossiers, dateDebut, dateFin = aujourdhui){
        
        return dossiers.filter(d => {
            return d.décisionsAdministratives?.find((décision) => (décision.date_signature !== null &&
                isAfter(décision.date_signature, dateDebut) &&
                isBefore(décision.date_signature, dateFin))
            )

        })
    }


    $: dossierAvecAPDepuisAnneeEnCours = trouverDossiersAvecAPPrisDepuis(dossierEnPhaseContrôle, startOfYear(aujourdhui))

    $: annéeDernière = sub(aujourdhui, {years: 1})
    
    $: dossierAvecAPAnneePrecedente = trouverDossiersAvecAPPrisDepuis(dossierEnPhaseContrôle, startOfYear(annéeDernière), endOfYear(annéeDernière))
    

    /**
     * 
     * @param {DossierRésumé[]} dossiers 
     */
    function trouverDossiersEnAccompagnement(dossiers){
        return dossiers.filter(dossier => dossier.phase === 'Accompagnement amont')
    }

    $: dossiersEnAccompagnement = trouverDossiersEnAccompagnement(dossiers)
    
    /**
     * 
     * @param {DossierRésumé[]} dossiers 
     */
    function trouverDossiersDeMoinsDe3Ans(dossiers){
        return dossiers.filter(d => isBefore(sub(aujourdhui, {years: 3}), d.date_dépôt))
    }

    $: dossiersEnAccompagnementDeMoinsDe3Ans = trouverDossiersDeMoinsDe3Ans(dossiersEnAccompagnement)

    /**
     * 
     * @param {DossierRésumé[]} dossiers 
     */
    function trouverDossiersNonScientifiques(dossiers){
        return dossiers.filter(d => d.activité_principale !== 'Demande à caractère scientifique')
    }

    $: dossiersNonScientifiquesEnAccompagnementDeMoinsDe3Ans = trouverDossiersNonScientifiques(dossiersEnAccompagnementDeMoinsDe3Ans)
</script>

<Squelette nav={false} {email}>
    <div class="fr-grid-row fr-mt-6w fr-grid-row--center">
        <article class="fr-col">
            <header class="fr-mb-2w">
                <h1>Des stats pour les chefs DREAL N-A</h1>
            </header>

            <section>
                <h2 class="fr-mt-2w">Nombre de dossiers&nbsp;: {dossiers.length} dossiers affichés</h2>
            </section>

         
            
            <section>
                <h2>Dossiers avec AP</h2>
                <ul>
                    <li><strong>
                        Nombre de dossiers 
                        en phase <TagPhase phase="Contrôle" taille="SM"></TagPhase> (avec AP)
                        </strong>&nbsp;: {dossierEnPhaseContrôle.length}
                    </li>
                    <li><strong>
                        Nombre de dossiers 
                        en phase <TagPhase phase="Contrôle" taille="SM"></TagPhase> 
                        avec AP pris en {getYear(aujourdhui)}
                        </strong>&nbsp;: {dossierAvecAPDepuisAnneeEnCours.length}
                    </li>
                    <li><strong>
                        Nombre de dossiers 
                        en phase <TagPhase phase="Contrôle" taille="SM"></TagPhase> 
                        avec AP pris en {getYear(annéeDernière)}
                        </strong>&nbsp;: {dossierAvecAPAnneePrecedente.length}
                    </li>
                </ul>
            </section>

            <section>
                <h2>Accompagnement</h2>
                <ul>
                    <li><strong>
                        Nombre de dossiers 
                        actuellement en phase <TagPhase phase="Accompagnement amont" taille="SM"></TagPhase>
                        </strong>&nbsp;: {dossiersEnAccompagnement.length}
                    </li>
                    <li><strong>
                        Nombre de dossiers 
                        actuellement en phase <TagPhase phase="Accompagnement amont" taille="SM"></TagPhase> 
                        qui ont moins de 3 ans
                        </strong>&nbsp;: {dossiersEnAccompagnementDeMoinsDe3Ans.length}
                    </li>
                    <li><strong>
                        Nombre de dossiers 
                        non-scientifiques 
                        actuellement en phase <TagPhase phase="Accompagnement amont" taille="SM"></TagPhase>
                        qui ont moins de 3 ans
                        </strong>&nbsp;: {dossiersNonScientifiquesEnAccompagnementDeMoinsDe3Ans.length}
                    </li>
                </ul>
            </section>
            
         
            
        </article>
    </div>
</Squelette>

<style lang="scss">
    
</style>
