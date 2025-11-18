<script>
	import { SvelteSet } from "svelte/reactivity"
    import NomEspèce from '../../NomEspèce.svelte'  
    /** @import { EspèceProtégée } from '../../../../types/especes' **/

    /**
     * @typedef {Object} Props
     * @property {'champTexte' | 'préciserLImpact'} écranAffiché
     * @property {Set<EspèceProtégée>} espècesModifiables
     * @property {(espece: EspèceProtégée) => void} supprimerEspèce
     */
    /** @type {Props} */
    let {
        écranAffiché = $bindable(),
        espècesModifiables,
        supprimerEspèce,
    } = $props();

    let oiseauxÀPréremplir = $derived(new SvelteSet([...espècesModifiables].filter(e => e.classification === 'oiseau')))
    let fauneNonOiseauxÀPréremplir = $derived(new SvelteSet([...espècesModifiables].filter(e => e.classification === 'faune non-oiseau')))
    let floreÀPréremplir = $derived(new SvelteSet([...espècesModifiables].filter(e => e.classification === 'flore')))

    function onClickRetour() {
        écranAffiché = 'champTexte'
    }
</script>

<div class="fr-modal__header">
    <button aria-controls="modale-préremplir-depuis-texte" title="Fermer" type="button" class="fr-btn--close fr-btn">Fermer</button>
</div>
<div class="fr-modal__content">
    <h2 id="modale-préremplir-depuis-texte-title" class="fr-modal__title">
        Pré-remplissage des espèces protégées impactées
    </h2>
    <div>
        {#if oiseauxÀPréremplir.size === 0 && fauneNonOiseauxÀPréremplir.size === 0 &&  floreÀPréremplir.size === 0}
            Aucune espèce n'a été renseignée.
        {:else}
            {#if oiseauxÀPréremplir.size >= 1}
                <section class="section-préremplir-espèces">
                    <h4>{`${oiseauxÀPréremplir.size} ${oiseauxÀPréremplir.size>=2 ? 'oiseaux' : 'oiseau'}`}</h4>
                    <ul>
                        {#each [...oiseauxÀPréremplir] as espèce (espèce)}
                            <li>
                            <NomEspèce {espèce}/> 
                                <button type="button" class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline" onclick={() => supprimerEspèce(espèce)}>
                                    Supprimer l'espèce #{espèce.nomsScientifiques}
                                </button>
                            </li>
                        {/each}
                    </ul>
                </section>
            {/if}
            {#if fauneNonOiseauxÀPréremplir.size >= 1}
                <section class="section-préremplir-espèces">
                    <h4>{`${fauneNonOiseauxÀPréremplir.size} ${fauneNonOiseauxÀPréremplir.size>=2 ? 'faunes' : 'faune'} non-oiseau`}</h4>
                    <ul>
                        {#each [...fauneNonOiseauxÀPréremplir] as espèce (espèce)}
                            <li>
                                <NomEspèce {espèce}/> 
                                <button type="button" class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline" onclick={() => supprimerEspèce(espèce)}>
                                    Supprimer l'espèce #{espèce.nomsScientifiques}
                                </button>
                            </li>
                        {/each}
                    </ul>
                </section>
            {/if}
            {#if floreÀPréremplir.size >= 1}
                <section class="section-préremplir-espèces">
                    <h4>{`${floreÀPréremplir.size} ${floreÀPréremplir.size>=2 ? 'flores' : 'flore'}`}</h4>
                    <ul>
                        {#each [...floreÀPréremplir] as espèce (espèce)}
                            <li>
                                <NomEspèce {espèce}/> 
                                <button type="button" class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline" onclick={() => supprimerEspèce(espèce)}>
                                    Supprimer l'espèce #{espèce.nomsScientifiques}
                                </button>
                            </li>
                        {/each}
                    </ul>
                </section>
            {/if}
        {/if}
    </div>
</div>

<div class="fr-modal__footer">
    <button type="button" class="fr-btn fr-btn--secondary fr-ml-auto" onclick={onClickRetour}>Retour</button>
    <button aria-controls="modale-préremplir-depuis-texte" type="button" class="fr-btn fr-ml-2w">Tout ajouter</button>
</div>