<script>
    /*
        Notes pour la prochaine itération

        Résoudre les issues suivantes si ça n'a pas encore été fait :
        - https://github.com/betagouv/pitchou/issues/157
        - https://github.com/betagouv/pitchou/issues/158

    */


    //@ts-check
    import Squelette from '../Squelette.svelte'
    import TagPhase from '../TagPhase.svelte'

    /** @import {DossierRésumé} from '../../../types/API_Pitchou.ts' */ 

    /** @type {DossierRésumé[]} */
    export let dossiers = []


    /** @type {string | undefined} */
    export let email = undefined

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
     */
    function trouverDossiersAvecAPPrisEn2024(dossiers){
        return dossiers.filter(d => {
            const historique_date_signature_arrêté_préfectoral = d.historique_date_signature_arrêté_préfectoral

            if(!historique_date_signature_arrêté_préfectoral)
                return true // vrai uniquement parce qu'on est en 2024 à l'écrture du code

            return new Date(historique_date_signature_arrêté_préfectoral).getFullYear() === 2024
        })
    }

    $: dossiersAvecAPPrisEn2024 = trouverDossiersAvecAPPrisEn2024(dossierEnPhaseContrôle)

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
        return dossiers.filter(d => {
            const dateDépôt = new Date(d.historique_date_réception_ddep || d.date_dépôt)

            return dateDépôt.getFullYear() >= 2022
        })
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
                <p>⚠️ Page très temporaire ⚠️</p>
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
                        avec AP pris en 2024
                        </strong>&nbsp;: {dossiersAvecAPPrisEn2024.length}
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
