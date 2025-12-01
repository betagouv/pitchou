<script>
	import EcranChampTexte from './ModalePréremplirDepuisTexte/EcranChampTexte.svelte'
    import EcranPréciserImpact from './ModalePréremplirDepuisTexte/EcranPréciserImpact.svelte'
    import TuileSaisieEspèce from '../SaisieEspèces/TuileSaisieEspèce.svelte'
    import { normalizeNomEspèce, normalizeTexteEspèce } from '../../../commun/manipulationStrings.js'
    /** @import { ParClassification, EspèceProtégée, DescriptionImpact, ActivitéMenançante, MéthodeMenançante, MoyenDePoursuiteMenaçant } from '../../../types/especes' **/

    /**
     * @typedef {Object} Props
     * @property {TuileSaisieEspèce[]} référencesEspèces
     * @property {ParClassification<EspèceProtégée[]>} espècesProtégéesParClassification
     * @property {(espècesImpactées: Array<{ espèce: EspèceProtégée, impacts: DescriptionImpact[] }>) => void} onClickPréRemplirAvecDocumentTexte
     * @property {ParClassification<Map<ActivitéMenançante['Identifiant Pitchou'], ActivitéMenançante>>} [activitesParClassificationEtreVivant]
     * @property {ParClassification<Map<MéthodeMenançante['Code'], MéthodeMenançante>>} méthodesParClassificationEtreVivant
     * @property {ParClassification<Map<MoyenDePoursuiteMenaçant['Code'], MoyenDePoursuiteMenaçant>>} transportsParClassificationEtreVivant
     */

    /** @type {Props} */
    let {
        référencesEspèces = $bindable(),
        espècesProtégéesParClassification,
        onClickPréRemplirAvecDocumentTexte,
        méthodesParClassificationEtreVivant,
        transportsParClassificationEtreVivant,
        activitesParClassificationEtreVivant
    } = $props();

    const idModalePréremplirDepuisTexte = 'modale-préremplir-depuis-texte'


    /**
     *
     * @param {string} texte
     * @returns {Set<EspèceProtégée>}
     */
     function chercherEspècesDansTexte(texte){
        /** @type {Set<EspèceProtégée>}*/
        let espècesTrouvées = new Set()

        for(const [nom, espClassif] of nomVersEspèceClassif){
            if(texte.includes(nom)){
                espècesTrouvées.add(espClassif)
            }
        }

        return espècesTrouvées
    }

    /** @type {'champTexte' | 'préciserImpact'}*/
    let écranAffiché = $state('champTexte')

    let nomVersEspèceClassif = $derived(créerNomVersEspèceClassif(espècesProtégéesParClassification))


    /**
     * Texte saisi par l'utilisateur
     */
    let texteEspèces = $state('')

    /** @type {Set<EspèceProtégée>} - Source de vérité : espèces trouvées dans le texte */
    let espècesTrouvéesDansTexte = $derived(chercherEspècesDansTexte(normalizeTexteEspèce(texteEspèces)))

    // Réinitialiser les espèces modifiables quand le texte change
    $effect(() => {
            réinitialiserEspècesImpactées(espècesTrouvéesDansTexte)
    })

    /**
     * @type {Array<{ espèce?: EspèceProtégée, impacts: DescriptionImpact[] }>}
     */
    let espècesImpactéesPourPréremplir =  $state([])

    /**
     * @param {number} indexEspèceÀSupprimer
     */
    async function supprimerEspèceImpactéeImpactée(indexEspèceÀSupprimer) {
        espècesImpactéesPourPréremplir.splice(indexEspèceÀSupprimer, 1)
    }

    /**
     * @param {Set<EspèceProtégée>} nouvellesEspècesImpactées
     */
   function réinitialiserEspècesImpactées(nouvellesEspècesImpactées) {
        /** @type { Array<{espèce: EspèceProtégée, impacts: DescriptionImpact[]}> }*/
        let _espècesImpactées = []
        nouvellesEspècesImpactées.forEach((espèce) => {
            _espècesImpactées.push({espèce, impacts:[
                {}]})
        })
        espècesImpactéesPourPréremplir = _espècesImpactées
   }

   function préremplirAvecCesEspècesImpacts() {
        /** @type {Array<{espèce: EspèceProtégée, impacts: DescriptionImpact[]}>}*/
        //@ts-ignore
        let nouvellesEspècesImpactées = espècesImpactéesPourPréremplir.filter((espèceImpactée) =>  espèceImpactée?.espèce !== undefined)

        onClickPréRemplirAvecDocumentTexte(nouvellesEspècesImpactées)
   }

   /**
    * @param {DescriptionImpact} impactPourChaqueOiseau
    * @param {DescriptionImpact} impactPourChaqueFauneNonOiseau
    * @param {DescriptionImpact} impactPourChaqueFlore
    */
   function ajouterImpactPourChaqueClassification(impactPourChaqueOiseau, impactPourChaqueFauneNonOiseau, impactPourChaqueFlore) {
        espècesImpactéesPourPréremplir.forEach((espèceImpactée) => {
            if (espèceImpactée.espèce && espèceImpactée.espèce.classification === 'oiseau') {
                espèceImpactée.impacts = [{...impactPourChaqueOiseau }]
            } else if (espèceImpactée.espèce && espèceImpactée.espèce.classification === 'faune non-oiseau') {
                espèceImpactée.impacts = [{...impactPourChaqueFauneNonOiseau}]
            } else if (espèceImpactée.espèce && espèceImpactée.espèce.classification === 'flore') {
                espèceImpactée.impacts = [{...impactPourChaqueFlore}]
            }
        })
   }

    /**
     * Recheche "à l'arrache"
     *
     * @param {ParClassification<EspèceProtégée[]>} espècesProtégéesParClassification
     * @returns {Map<string, EspèceProtégée>}
     */
    function créerNomVersEspèceClassif(espècesProtégéesParClassification){
        /** @type {Map<string, EspèceProtégée>}>} */
        const nomVersEspèceClassif = new Map()

        for(const espèces of Object.values(espècesProtégéesParClassification)){
            for(const espèce of espèces){
                const {nomsScientifiques, nomsVernaculaires} = espèce;
                if(nomsScientifiques.size >= 1){
                    for(const nom of nomsScientifiques){
                        const normalized = normalizeNomEspèce(nom)
                        if(normalized && normalized.length >= 3){
                            nomVersEspèceClassif.set(normalized, espèce)
                        }
                    }
                }

                if(nomsVernaculaires.size >= 1){
                    for(const nom of nomsVernaculaires){
                        const normalized = normalizeNomEspèce(nom)
                        if(normalized && normalized.length >= 3){
                            nomVersEspèceClassif.set(normalized, espèce)
                        }
                    }
                }
            }
        }

        return nomVersEspèceClassif
    }

</script>

<dialog id="modale-préremplir-depuis-texte" class="fr-modal" aria-label="Pré-remplissage des espèces protégées impactées" aria-modal="true" data-fr-concealing-backdrop="false">
    <div class="fr-container fr-container--fluid fr-container-md">
        <div class="fr-grid-row fr-grid-row--center">
            <div class="fr-col-12 fr-col-md-10 fr-col-lg-8">
                <div class="fr-modal__body">
                    {#if écranAffiché === 'champTexte'}
                        <EcranChampTexte
                            bind:texteEspèces={texteEspèces}
                            bind:espècesTrouvéesDansTexte={espècesTrouvéesDansTexte}
                            bind:écranAffiché={écranAffiché}
                            espècesImpactéesPourPréremplir={espècesImpactéesPourPréremplir}
                            {espècesProtégéesParClassification}
                            {idModalePréremplirDepuisTexte}
                            préremplirAvecCesEspècesImpacts={préremplirAvecCesEspècesImpacts}
                            supprimerEspèceImpactée={supprimerEspèceImpactéeImpactée}
                            />
                    {:else if écranAffiché === 'préciserImpact'}
                        <EcranPréciserImpact
                            bind:écranAffiché={écranAffiché}
                            espècesImpactéesPourPréremplir={espècesImpactéesPourPréremplir}
                            supprimerEspèceImpactée={supprimerEspèceImpactéeImpactée}
                            préremplirAvecCesEspècesImpacts={préremplirAvecCesEspècesImpacts}
                            {ajouterImpactPourChaqueClassification}
                            {méthodesParClassificationEtreVivant}
                            {transportsParClassificationEtreVivant}
                            {activitesParClassificationEtreVivant}
                        />
                    {/if}
                </div>
            </div>
        </div>
    </div>
</dialog>
