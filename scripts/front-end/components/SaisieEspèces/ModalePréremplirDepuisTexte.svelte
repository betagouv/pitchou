<script>
	import EcranChampTexte from './ModalePréremplirDepuisTexte/EcranChampTexte.svelte'
    import EcranPréciserLImpact from './ModalePréremplirDepuisTexte/EcranPréciserLImpact.svelte'

    /** @import { ParClassification, EspèceProtégée, DescriptionImpact } from '../../../types/especes' **/

    /**
     * @typedef {Object} Props
     * @property {ParClassification<EspèceProtégée[]>} espècesProtégéesParClassification
     * @property {(espècesImpactées: Array<{ espèce: EspèceProtégée, impacts: DescriptionImpact[] }>) => void} onClickPréRemplirAvecDocumentTexte
     */

    /** @type {Props} */
    let {
        espècesProtégéesParClassification,
        onClickPréRemplirAvecDocumentTexte,
    } = $props();

   const idModalePréremplirDepuisTexte = 'modale-préremplir-depuis-texte'

    /** @type {'champTexte' | 'préciserLImpact'}*/
    let écranAffiché = $state('champTexte')

    /**
     * @type {Array<{ espèce: EspèceProtégée, impacts: DescriptionImpact[] }>}
     */
    let espècesModifiables =  $state([]) // modifier le nom

    /**
     * @param {number} indexEspèceÀSupprimer
     */
    async function supprimerEspèce(indexEspèceÀSupprimer) {
        espècesModifiables.splice(indexEspèceÀSupprimer, 1)
    }

    /**
     * @param {Set<EspèceProtégée>} espèces
     */
   function réinitialiserEspècesModifiables(espèces) {
        /** @type { Array<{espèce: EspèceProtégée, impacts: DescriptionImpact[]}> }*/
        let _espècesImpactées = []
        espèces.forEach((espèce) => {
            _espècesImpactées.push({espèce, impacts:[{}]})
        })
        espècesModifiables = _espècesImpactées
   }

   function onValiderLaListeDesEspèces() {
        onClickPréRemplirAvecDocumentTexte(espècesModifiables)
   }
</script>

<dialog id="modale-préremplir-depuis-texte" class="fr-modal" aria-labelledby="Pré-remplissage des espèces protégées impactées" aria-modal="true" data-fr-concealing-backdrop="false">
    <div class="fr-container fr-container--fluid fr-container-md">
        <div class="fr-grid-row fr-grid-row--center">
            <div class="fr-col-12 fr-col-md-10 fr-col-lg-8">
                <div class="fr-modal__body">
                    {#if écranAffiché === 'champTexte'}
                        <EcranChampTexte 
                            bind:écranAffiché={écranAffiché} 
                            espècesModifiables={espècesModifiables}
                            {espècesProtégéesParClassification}  
                            {idModalePréremplirDepuisTexte} 
                            {onValiderLaListeDesEspèces} 
                            {supprimerEspèce}
                            {réinitialiserEspècesModifiables}
                            />
                    {:else if écranAffiché === 'préciserLImpact'}
                        <EcranPréciserLImpact bind:écranAffiché={écranAffiché} {espècesModifiables} {supprimerEspèce} {onValiderLaListeDesEspèces} />
                    {/if}
                </div>
            </div>
        </div>
    </div>
</dialog>

