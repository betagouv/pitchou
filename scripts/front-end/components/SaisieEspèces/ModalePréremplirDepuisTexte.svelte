<script>
    import NomEspèce from '../NomEspèce.svelte'
	/** @import { EspèceProtégée } from "../../../types/especes" */

    /**
     * @typedef {Object} Props
     * @property {string} texteEspèces
     * @property {EspèceProtégée[]} espècesÀPréremplir
     */

    /** @type {Props} */
    let {
        texteEspèces = $bindable(),
        espècesÀPréremplir = $bindable(),
    } = $props();

    let oiseauxÀPréremplir = $derived(new Set(espècesÀPréremplir.filter(e => e.classification === 'oiseau')))
    let fauneNonOiseauxÀPréremplir = $derived(new Set(espècesÀPréremplir.filter(e => e.classification === 'faune non-oiseau')))
    let floreÀPréremplir = $derived(new Set(espècesÀPréremplir.filter(e => e.classification === 'flore')))
</script>

<dialog id="modale-préremplir-depuis-texte" class="fr-modal" aria-labelledby="Pré-remplissage des espèces protégées impactées" aria-modal="true">
    <div class="fr-container fr-container--fluid fr-container-md">
        <div class="fr-grid-row fr-grid-row--center">
            <div class="fr-col-12 fr-col-md-8 fr-col-lg-6">
                <div class="fr-modal__body">
                    <div class="fr-modal__header">
                        <button aria-controls="modale-préremplir-depuis-texte" title="Fermer" type="button" class="fr-btn--close fr-btn">Fermer</button>
                    </div>
                    <div class="fr-modal__content">
                        <h2 id="modale-préremplir-depuis-texte-title" class="fr-modal__title">
                            Pré-remplissage des espèces protégées impactées
                        </h2>
                        <div class="fr-mb-4w">
                            {#if oiseauxÀPréremplir.size >= 1}
                                <section class="préremplir-espèces fr-mb-4w">
                                <h3>{oiseauxÀPréremplir.size} oiseaux</h3>
                                <ul>
                                    {#each [...oiseauxÀPréremplir] as espèce (espèce)}
                                        <li><NomEspèce {espèce}/></li>
                                    {/each}
                                </ul>

                            </section>
                            {/if}
                            {#if fauneNonOiseauxÀPréremplir.size >= 1}
                                <section class="préremplir-espèces fr-mb-4w">
                                    <h3>{fauneNonOiseauxÀPréremplir.size} faunes non-oiseau</h3>
                                    <ul>
                                        {#each [...fauneNonOiseauxÀPréremplir] as espèce (espèce)}
                                            <li><NomEspèce {espèce}/></li>
                                        {/each}
                                    </ul>
                                </section>
                            {/if}
                            {#if floreÀPréremplir.size >= 1}
                                <section class="préremplir-espèces fr-mb-4w">
                                    <h3>{floreÀPréremplir.size} faunes non-oiseau</h3>
                                    <ul>
                                        {#each [...floreÀPréremplir] as espèce (espèce)}
                                            <li><NomEspèce {espèce}/></li>
                                        {/each}
                                    </ul>
                                </section>
                            {/if}
                            <textarea bind:value={texteEspèces} class="fr-input"></textarea>
                        </div>
                    </div>
                    <div class="fr-modal__footer">
                        <button aria-controls="modale-préremplir-depuis-texte" type="button" class="fr-btn fr-ml-auto">Valider le texte</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</dialog>

<style>

</style>
