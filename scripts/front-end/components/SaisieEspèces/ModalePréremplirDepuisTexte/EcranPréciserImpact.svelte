<script>
	import { SvelteSet } from "svelte/reactivity"
    import NomEspèce from '../../NomEspèce.svelte' 
    import ImpactEspèce from '../../SaisieEspèces/ImpactEspèce.svelte' 
	import { tick } from "svelte"
    /** @import { EspèceProtégée, DescriptionImpact, ParClassification, ActivitéMenançante, MéthodeMenançante, TransportMenançant } from '../../../../types/especes' **/

    /**
     * @typedef {Object} Props
     * @property {'champTexte' | 'préciserImpact'} écranAffiché
     * @property {Array<{ espèce?: EspèceProtégée, impacts: DescriptionImpact[] }>} espècesImpactéesPourPréremplir
     * @property {(indexEspèceÀSupprimer: number) => Promise<void>} supprimerEspèceImpactée
     * @property {() => void} préremplirAvecCesEspècesImpacts
     * @property {ParClassification<Map<ActivitéMenançante['Identifiant Pitchou'], ActivitéMenançante>>} [activitesParClassificationEtreVivant]
     * @property {ParClassification<Map<MéthodeMenançante['Code'], MéthodeMenançante>>} méthodesParClassificationEtreVivant
     * @property {ParClassification<Map<TransportMenançant['Code'], TransportMenançant>>} transportsParClassificationEtreVivant
     * @property {(impactPourChaqueOiseau: DescriptionImpact, impactPourChaqueFauneNonOiseau: DescriptionImpact, impactPourChaqueFlore: DescriptionImpact) => void} ajouterImpactPourChaqueClassification
     */
    /** @type {Props} */
    let {
        écranAffiché = $bindable(),
        espècesImpactéesPourPréremplir,
        supprimerEspèceImpactée,
        préremplirAvecCesEspècesImpacts,
        méthodesParClassificationEtreVivant,
        transportsParClassificationEtreVivant,
        activitesParClassificationEtreVivant,
        ajouterImpactPourChaqueClassification
    } = $props();

    /**
     * @type {DescriptionImpact}
    */
    let impactPourChaqueOiseau = $state({})

    /**
     * @type {DescriptionImpact}
    */
    let impactPourChaqueFauneNonOiseau = $state({})

    /**
     * @type {DescriptionImpact}
    */
    let impactPourChaqueFlore = $state({})

    

    /** @type { SvelteSet<EspèceProtégée> }*/
    //@ts-ignore
    let oiseauxÀPréremplir = $derived(new SvelteSet([...espècesImpactéesPourPréremplir.map(({ espèce }) => espèce)].filter(e => e && e.classification === 'oiseau')))
    /** @type { SvelteSet<EspèceProtégée> }*/
    //@ts-ignore
    let fauneNonOiseauxÀPréremplir = $derived(new SvelteSet([...espècesImpactéesPourPréremplir.map(({ espèce }) => espèce)].filter(e => e && e.classification === 'faune non-oiseau')))
    /** @type { SvelteSet<EspèceProtégée> }*/
    //@ts-ignore
    let floreÀPréremplir = $derived(new SvelteSet([...espècesImpactéesPourPréremplir.map(({ espèce }) => espèce)].filter(e => e && e.classification === 'flore')))

    /**
     * @type {HTMLElement}
     */
    let titreModale;

$effect.pre(() => {
    if (écranAffiché === 'préciserImpact') {
        tick().then(() => {
            if (!titreModale) {
                console.error('❌ titreModale est undefined!')
                return
            }
            
            console.log('✅ titreModale trouvé:', titreModale)
            console.log('📋 Contenu:', titreModale.textContent)
            
            
            titreModale.focus()
            
            // Vérifier après
            setTimeout(() => {
                const isFocused = document.activeElement === titreModale
                console.log(isFocused ? '✅ Focus réussi!' : '❌ Focus échoué')
                console.log('🎯 Élément actif:', document.activeElement)
            }, 100)
        })
    }
})

    /**
     * @param {EspèceProtégée} espèce
     */
    function supprimerEspèceImpactéeDepuisClassification(espèce) {
        const indexDansListe = espècesImpactéesPourPréremplir.findIndex(({ espèce: espèceImpactée }) => espèceImpactée === espèce)
        if (indexDansListe >= 0) {
            supprimerEspèceImpactée(indexDansListe)
        }
    }

    function onClickToutAjouter() {
        ajouterImpactPourChaqueClassification(impactPourChaqueOiseau, impactPourChaqueFauneNonOiseau, impactPourChaqueFlore)
        préremplirAvecCesEspècesImpacts()

    }
</script>

<div class="fr-modal__header">
    <button aria-controls="modale-préremplir-depuis-texte" title="Fermer" type="button" class="fr-btn--close fr-btn">Fermer</button>
</div>
<div class="fr-modal__content">
    <h2 bind:this={titreModale} id="modale-préremplir-depuis-texte-title" class="fr-modal__title" tabindex="-1">
        Préciser l'impact pour chaque type d'espèce
    </h2>
    <div>
        {#if oiseauxÀPréremplir.size === 0 && fauneNonOiseauxÀPréremplir.size === 0 &&  floreÀPréremplir.size === 0}
            Aucune espèce n'a été renseignée.
        {:else}
            {#if oiseauxÀPréremplir.size >= 1}
                <section class="section-espèce-par-classification">
                    <h3>{`${oiseauxÀPréremplir.size} ${oiseauxÀPréremplir.size>=2 ? 'oiseaux' : 'oiseau'}`}</h3>
                    <ul>
                        {#each [...oiseauxÀPréremplir] as espèce (espèce)}
                            <li>
                                <NomEspèce {espèce}/> 
                                <button type="button" class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline" onclick={() => supprimerEspèceImpactéeDepuisClassification(espèce)}>
                                    Supprimer l'espèce {[...espèce.nomsVernaculaires].join(',')}
                                </button>
                            </li>
                        {/each}
                    </ul>
                    <ImpactEspèce
                        bind:impact={impactPourChaqueOiseau}
                        indexEspèce={0}
                        espèceClassification={'oiseau'}
                        activitesParClassificationEtreVivant={activitesParClassificationEtreVivant}
                        méthodesParClassificationEtreVivant={méthodesParClassificationEtreVivant}
                        transportsParClassificationEtreVivant={transportsParClassificationEtreVivant}
                    />  
                </section>
            {/if}
            {#if fauneNonOiseauxÀPréremplir.size >= 1}
                <section class="section-espèce-par-classification">
                    <h3>{`${fauneNonOiseauxÀPréremplir.size} ${fauneNonOiseauxÀPréremplir.size>=2 ? 'faunes' : 'faune'} non-oiseau`}</h3>
                    <ul>
                    {#each [...fauneNonOiseauxÀPréremplir] as espèce (espèce)}
                        <li>
                            <NomEspèce {espèce}/> 
                            <button type="button" class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline" onclick={() => supprimerEspèceImpactéeDepuisClassification(espèce)}>
                                Supprimer l'espèce {[...espèce.nomsVernaculaires].join(',')}
                            </button>
                        </li>
                        {/each}
                    </ul>
                    <ImpactEspèce
                        bind:impact={impactPourChaqueFauneNonOiseau}
                        indexEspèce={1}
                        espèceClassification={'faune non-oiseau'}
                        activitesParClassificationEtreVivant={activitesParClassificationEtreVivant}
                        méthodesParClassificationEtreVivant={méthodesParClassificationEtreVivant}
                        transportsParClassificationEtreVivant={transportsParClassificationEtreVivant}
                    />  
                </section>
            {/if}
            {#if floreÀPréremplir.size >= 1}
                <section class="section-espèce-par-classification">
                    <h3>{`${floreÀPréremplir.size} ${floreÀPréremplir.size>=2 ? 'flores' : 'flore'}`}</h3>
                    <ul>
                    {#each [...floreÀPréremplir] as espèce (espèce)}
                        <li>
                            <NomEspèce {espèce}/> 
                            <button type="button" class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline" onclick={() => supprimerEspèceImpactéeDepuisClassification(espèce)}>
                                Supprimer l'espèce {[...espèce.nomsVernaculaires].join(',')}
                            </button>
                        </li>
                        {/each}
                    </ul>
                    <ImpactEspèce
                        bind:impact={impactPourChaqueFlore}
                        indexEspèce={2}
                        espèceClassification={'flore'}
                        activitesParClassificationEtreVivant={activitesParClassificationEtreVivant}
                        méthodesParClassificationEtreVivant={méthodesParClassificationEtreVivant}
                        transportsParClassificationEtreVivant={transportsParClassificationEtreVivant}
                    />  
                </section>
            {/if}
        {/if}
    </div>
</div>

<div class="fr-modal__footer">
    <button type="button" class="fr-btn fr-btn--secondary fr-ml-auto" onclick={() => écranAffiché = 'champTexte'}>Retour</button>
    <button aria-controls="modale-préremplir-depuis-texte" type="button" class="fr-btn fr-ml-2w" onclick={onClickToutAjouter}>Tout ajouter</button>
</div>


<style>
    .section-espèce-par-classification {
        margin-bottom: 2rem;
        h3 {
            margin-bottom: 0.75rem;
            font-size: 1.25rem;
        }
        ul{
            margin: 0;
            margin-bottom: 2rem;
            list-style: none;
        }
        li{
            padding:0 !important;
            font-size: 0.90rem !important;
        }
    }
</style>