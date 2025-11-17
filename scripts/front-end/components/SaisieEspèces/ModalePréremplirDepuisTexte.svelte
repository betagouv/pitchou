<script>
	import EcranChampTexte from './ModalePréremplirDepuisTexte/EcranChampTexte.svelte'
    import EcranPréciserLImpact from './ModalePréremplirDepuisTexte/EcranPréciserLImpact.svelte'

    /** @import { ParClassification, EspèceProtégée } from '../../../types/especes' **/

    /**
     * @typedef {Object} Props
     * @property {EspèceProtégée[]} espècesÀPréremplir
     * @property {ParClassification<EspèceProtégée[]>} espècesProtégéesParClassification
     */

    /** @type {Props} */
    let {
        espècesÀPréremplir = $bindable(),
        espècesProtégéesParClassification,
    } = $props();


    /** @type {'champTexte' | 'préciserLImpact'}*/
    let écranAffiché = $state('champTexte')

   const idModalePréremplirDepuisTexte = 'modale-préremplir-depuis-texte'
</script>

<dialog id="modale-préremplir-depuis-texte" class="fr-modal" aria-labelledby="Pré-remplissage des espèces protégées impactées" aria-modal="true" data-fr-concealing-backdrop="false">
    <div class="fr-container fr-container--fluid fr-container-md">
        <div class="fr-grid-row fr-grid-row--center">
            <div class="fr-col-12 fr-col-md-10 fr-col-lg-8">
                <div class="fr-modal__body">
                    {#if écranAffiché === 'champTexte'}
                        <EcranChampTexte bind:espècesÀPréremplir={espècesÀPréremplir} bind:écranAffiché={écranAffiché} {espècesProtégéesParClassification}  {idModalePréremplirDepuisTexte} />
                    {:else if écranAffiché === 'préciserLImpact'}
                        <EcranPréciserLImpact />
                    {/if}
                </div>
            </div>
        </div>
    </div>
</dialog>

