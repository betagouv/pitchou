<script>
	import { SvelteSet } from 'svelte/reactivity'
    import { normalizeNomEspèce, normalizeTexteEspèce } from '../../../commun/manipulationStrings.js'
    import NomEspèce from '../NomEspèce.svelte'

    /** @import { ParClassification, EspèceProtégée } from '../../../types/especes.d.ts' **/

    /**
     * @typedef {Object} Props
     * @property {string} texteEspèces
     * @property {EspèceProtégée[]} espècesÀPréremplir
     * @property {ParClassification<EspèceProtégée[]>} espècesProtégéesParClassification
     */

    /** @type {Props} */
    let {
        texteEspèces = $bindable(),
        espècesÀPréremplir = $bindable(),
        espècesProtégéesParClassification,
    } = $props();

    /** @type {Set<EspèceProtégée>} - Source de vérité : espèces trouvées dans le texte */
    let espècesTrouvéesDansTexte = $derived(chercherEspècesDansTexte(normalizeTexteEspèce(texteEspèces)))

    /** @type {Set<EspèceProtégée>} - État modifiable par l'utilisateur */
    let espècesModifiables = $state(new SvelteSet())

    // Réinitialiser les espèces modifiables quand le texte change
    $effect(() => {
        espècesModifiables = new SvelteSet(espècesTrouvéesDansTexte)
    })

    let oiseauxÀPréremplir = $derived(new SvelteSet([...espècesModifiables].filter(e => e.classification === 'oiseau')))
    let fauneNonOiseauxÀPréremplir = $derived(new SvelteSet([...espècesModifiables].filter(e => e.classification === 'faune non-oiseau')))
    let floreÀPréremplir = $derived(new SvelteSet([...espècesModifiables].filter(e => e.classification === 'flore')))

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

    let nomVersEspèceClassif = $derived(créerNomVersEspèceClassif(espècesProtégéesParClassification))

    /**
     *
     * @param {string} texte
     * @returns {Set<EspèceProtégée>}
     */
     function chercherEspècesDansTexte(texte){
        /** @type {Set<EspèceProtégée>}*/
        const espècesTrouvées = new SvelteSet()

        for(const [nom, espClassif] of nomVersEspèceClassif){
            if(texte.includes(nom)){
                espècesTrouvées.add(espClassif)
            }
        }

        return espècesTrouvées
    }

   function onAjouterLesEspècesPréremplies() {
        espècesÀPréremplir = [...espècesModifiables]
   }

    /**
     * @param {EspèceProtégée} espèce
     */
    function supprimerEspèce(espèce) {
        espècesModifiables.delete(espèce)
    }
</script>

<dialog id="modale-préremplir-depuis-texte" class="fr-modal" aria-labelledby="Pré-remplissage des espèces protégées impactées" aria-modal="true" data-fr-concealing-backdrop="false">
    <div class="fr-container fr-container--fluid fr-container-md">
        <div class="fr-grid-row fr-grid-row--center">
            <div class="fr-col-12 fr-col-md-10 fr-col-lg-8">
                <div class="fr-modal__body">
                    <div class="fr-modal__header">
                        <button aria-controls="modale-préremplir-depuis-texte" title="Fermer" type="button" class="fr-btn--close fr-btn">Fermer</button>
                    </div>
                    <div class="fr-modal__content">
                        <h2 id="modale-préremplir-depuis-texte-title" class="fr-modal__title">
                            Pré-remplissage des espèces protégées impactées
                        </h2>
                        <div class="fr-grid-row fr-grid-row--gutters">
                            <div class='fr-col-4'>
                                <h3 class="fr-h6" id="label-champ-texte-espece"> Votre texte </h3>
                                <textarea id={'champ-texte-espece'} bind:value={texteEspèces} class="fr-input" rows="20" aria-labelledby="label-champ-texte-espece"></textarea>
                            </div>
                            <div class='fr-col'>
                                <h3 class="fr-h6">Les espèces trouvées</h3>
                                {#if texteEspèces !== '' && oiseauxÀPréremplir.size === 0 && fauneNonOiseauxÀPréremplir.size === 0 &&  floreÀPréremplir.size === 0}
                                    Aucune espèce n'a été trouvée.
                                {:else}
                                    {#if oiseauxÀPréremplir.size >= 1}
                                        <section class="section-préremplir-espèces">
                                            <h4>{`${oiseauxÀPréremplir.size} oiseau${oiseauxÀPréremplir.size>=2 ? 'x' : ''}`}</h4>
                                            <ul>
                                                {#each [...oiseauxÀPréremplir] as espèce (espèce)}
                                                    <li>
                                                    <NomEspèce {espèce}/> 
                                                        <button type="button" class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline" onclick={() => supprimerEspèce(espèce)}>
                                                            libellé du bouton
                                                            <span class="fr-sr-only">Supprimer l'espèce #{espèce.nomsScientifiques}</span>
                                                        </button>
                                                    </li>
                                                {/each}
                                            </ul>
                                        </section>
                                    {/if}
                                    {#if fauneNonOiseauxÀPréremplir.size >= 1}
                                        <section class="section-préremplir-espèces">
                                            <h4>{`${fauneNonOiseauxÀPréremplir.size} faune${fauneNonOiseauxÀPréremplir.size>=2 ? 's' : ''} non-oiseau`}</h4>
                                            <ul>
                                                {#each [...fauneNonOiseauxÀPréremplir] as espèce (espèce)}
                                                    <li>
                                                        <NomEspèce {espèce}/> 
                                                        <button type="button" class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline" onclick={() => supprimerEspèce(espèce)}>
                                                            libellé du bouton
                                                            <span class="fr-sr-only">Supprimer l'espèce #{espèce.nomsScientifiques}</span>
                                                        </button>
                                                    </li>
                                                {/each}
                                            </ul>
                                        </section>
                                    {/if}
                                    {#if floreÀPréremplir.size >= 1}
                                        <section class="section-préremplir-espèces">
                                            <h4>{`${floreÀPréremplir.size} flore${floreÀPréremplir.size>=2 ? 's' : ''}`}</h4>
                                            <ul>
                                                {#each [...floreÀPréremplir] as espèce (espèce)}
                                                    <li>
                                                        <NomEspèce {espèce}/> 
                                                        <button type="button" class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline" onclick={() => supprimerEspèce(espèce)}>
                                                            libellé du bouton
                                                            <span class="fr-sr-only">Supprimer l'espèce #{espèce.nomsScientifiques}</span>
                                                        </button>
                                                    </li>
                                                {/each}
                                            </ul>
                                        </section>
                                    {/if}
                                {/if}
                            </div>
                        </div>
                    </div>
                    <div class="fr-modal__footer">
                        <button aria-controls="modale-préremplir-depuis-texte" type="button" class="fr-btn fr-ml-auto" onclick={onAjouterLesEspècesPréremplies}>{`Ajouter ${espècesModifiables.size} espèce${espècesModifiables.size>=2 ? 's' : ''}`}</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</dialog>

<style>
    .section-préremplir-espèces{
        margin-bottom: 2rem;

        ul{
            margin: 0;
            list-style: none;
        }
        h4 {
            font-size: 1.125rem;
            margin-bottom: 0;
        }
    }
</style>
