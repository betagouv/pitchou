<script>
	import { SvelteSet } from "svelte/reactivity"
    import NomEspèce from '../../NomEspèce.svelte' 
    import ImpactEspèce from '../../SaisieEspèces/ImpactEspèce.svelte' 
    /** @import { EspèceProtégée, DescriptionImpact, ParClassification, ActivitéMenançante, MéthodeMenançante, TransportMenançant } from '../../../../types/especes' **/

    /**
     * @typedef {Object} Props
     * @property {'champTexte' | 'préciserLImpact'} écranAffiché
     * @property {Array<{ espèce?: EspèceProtégée, impacts: DescriptionImpact[] }>} espècesModifiables
     * @property {(indexEspèceÀSupprimer: number) => void} supprimerEspèce
     * @property {() => void} onValiderLaListeDesEspèces
     * @property {ParClassification<Map<ActivitéMenançante['Identifiant Pitchou'], ActivitéMenançante>>} [activitesParClassificationEtreVivant]
     * @property {ParClassification<Map<MéthodeMenançante['Code'], MéthodeMenançante>>} méthodesParClassificationEtreVivant
     * @property {ParClassification<Map<TransportMenançant['Code'], TransportMenançant>>} transportsParClassificationEtreVivant
     */
    /** @type {Props} */
    let {
        écranAffiché = $bindable(),
        espècesModifiables,
        supprimerEspèce,
        onValiderLaListeDesEspèces,
        méthodesParClassificationEtreVivant,
        transportsParClassificationEtreVivant,
        activitesParClassificationEtreVivant
    } = $props();

    /** @type { SvelteSet<EspèceProtégée> }*/
    //@ts-ignore
    let oiseauxÀPréremplir = $derived(new SvelteSet([...espècesModifiables.map(({ espèce }) => espèce)].filter(e => e && e.classification === 'oiseau')))
    /** @type { SvelteSet<EspèceProtégée> }*/
    //@ts-ignore
    let fauneNonOiseauxÀPréremplir = $derived(new SvelteSet([...espècesModifiables.map(({ espèce }) => espèce)].filter(e => e && e.classification === 'faune non-oiseau')))
    /** @type { SvelteSet<EspèceProtégée> }*/
    //@ts-ignore
    let floreÀPréremplir = $derived(new SvelteSet([...espècesModifiables.map(({ espèce }) => espèce)].filter(e => e && e.classification === 'flore')))

    function onClickRetour() {
        écranAffiché = 'champTexte'
    }

    /**
     * @param {EspèceProtégée} espèce
     */
    function supprimerEspèceDepuisClassification(espèce) {
        const indexDansListe = espècesModifiables.findIndex(({ espèce: espèceImpactée }) => espèceImpactée === espèce)
        if (indexDansListe >= 0) {
            supprimerEspèce(indexDansListe)
        }
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
                                <button type="button" class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline fr-mb-4w" onclick={() => supprimerEspèceDepuisClassification(espèce)}>
                                    Supprimer l'espèce #{espèce.nomsScientifiques}
                                </button>
                            </li>                        
                        {/each}
                        <ImpactEspèce
                            espèceClassification={'oiseau'}
                            activitesParClassificationEtreVivant={activitesParClassificationEtreVivant}
                            méthodesParClassificationEtreVivant={méthodesParClassificationEtreVivant}
                            transportsParClassificationEtreVivant={transportsParClassificationEtreVivant}
                        />  
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
                                <button type="button" class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline" onclick={() => supprimerEspèceDepuisClassification(espèce)}>
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
                                <button type="button" class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline" onclick={() => supprimerEspèceDepuisClassification(espèce)}>
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
    <button aria-controls="modale-préremplir-depuis-texte" type="button" class="fr-btn fr-ml-2w" onclick={onValiderLaListeDesEspèces}>Tout ajouter</button>
</div>


<style>
    .section-préremplir-espèces{
        ul{
            margin: 0;
            list-style: none;
        }
    }
</style>