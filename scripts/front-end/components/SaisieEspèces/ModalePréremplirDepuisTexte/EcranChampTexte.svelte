<script>
	import { SvelteSet } from 'svelte/reactivity'
    import NomEspèce from '../../NomEspèce.svelte'
    import DéplierReplier from '../../common/DéplierReplier.svelte'
	import { mailtoJeNetrouvePasUneEspèce } from '../../../../commun/constantes.js'

    /** @import { ParClassification, EspèceProtégée, DescriptionImpact } from '../../../../types/especes' **/
    
    /**
     * @typedef {Object} Props
     * @property {Set<EspèceProtégée>} espècesTrouvéesDansTexte
     * @property {string} texteEspèces
     * @property {'champTexte' | 'préciserImpact'} écranAffiché
     * @property {Array<{ espèce?: EspèceProtégée, impacts: DescriptionImpact[] }>} espècesImpactéesPourPréremplir
     * @property {() => void} préremplirAvecCesEspècesImpacts
     * @property {(indexEspèceÀSupprimer: number) => void} supprimerEspèceImpactée
     * @property {ParClassification<EspèceProtégée[]>} espècesProtégéesParClassification
     * @property {string} idModalePréremplirDepuisTexte
     */

    /** @type {Props} */
    let {
        espècesTrouvéesDansTexte = $bindable(),
        texteEspèces = $bindable(),
        écranAffiché = $bindable(),
        espècesImpactéesPourPréremplir,
        idModalePréremplirDepuisTexte,
        préremplirAvecCesEspècesImpacts,
        supprimerEspèceImpactée,
    } = $props();

    /** @type { SvelteSet<EspèceProtégée> }*/
    //@ts-ignore
    let oiseauxÀPréremplir = $derived(new SvelteSet([...espècesImpactéesPourPréremplir.map((espèceImpactée) => espèceImpactée.espèce)].filter(e => e && e.classification === 'oiseau')))
    /** @type { SvelteSet<EspèceProtégée> }*/
    //@ts-ignore
    let fauneNonOiseauxÀPréremplir = $derived(new SvelteSet([...espècesImpactéesPourPréremplir.map((espèceImpactée) => espèceImpactée.espèce)].filter(e => e && e.classification === 'faune non-oiseau')))
    /** @type { SvelteSet<EspèceProtégée> }*/
    //@ts-ignore
    let floreÀPréremplir = $derived(new SvelteSet([...espècesImpactéesPourPréremplir.map((espèceImpactée) => espèceImpactée.espèce)].filter(e => e && e.classification === 'flore')))

    function onClickpréciserImpact() {
        écranAffiché = 'préciserImpact'
    }


/**
 * @param {EspèceProtégée} espèce
 */
function supprimerEspèceImpactéeDepuisClassification(espèce) {
    const indexDansListe = espècesImpactéesPourPréremplir.findIndex(({ espèce: espèceImpactée }) => espèceImpactée === espèce)
    if (indexDansListe >= 0) {
        supprimerEspèceImpactée(indexDansListe)
    }
}
</script>

<div class="fr-modal__header">
    <button aria-controls={idModalePréremplirDepuisTexte} title="Fermer" type="button" class="fr-btn--close fr-btn">Fermer</button>
</div>
<div class="fr-modal__content">
    <h2 id="modale-préremplir-depuis-texte-title" class="fr-modal__title">
        Pré-remplissage des espèces protégées impactées
    </h2>
    <div class="fr-grid-row fr-grid-row--gutters">
        <div class='fr-col-12 fr-col-sm'>
            <h3 class="fr-h6" id="label-champ-texte-espece"> Votre texte </h3>
            <textarea id={'champ-texte-espece'} bind:value={texteEspèces} class="fr-input fr-mb-2w" rows="14" aria-labelledby="label-champ-texte-espece"></textarea>
        </div>
        <div class='fr-col'>
            <h3 class="fr-h6">Les espèces trouvées</h3>
            {#if texteEspèces !== '' && oiseauxÀPréremplir.size === 0 && fauneNonOiseauxÀPréremplir.size === 0 &&  floreÀPréremplir.size === 0}
                Aucune espèce n'a été trouvée.
            {:else}
                {#if oiseauxÀPréremplir.size >= 1}
                    <section class="section-espèce-par-classification fr-mb-1w">
                        <h4>{`${oiseauxÀPréremplir.size} ${oiseauxÀPréremplir.size>=2 ? 'oiseaux' : 'oiseau'}`}</h4>
                        <ul>
                            {#each [...oiseauxÀPréremplir] as espèce (espèce)}
                                <li>
                                <NomEspèce {espèce}/> 
                                    <button type="button" class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline" onclick={() => supprimerEspèceImpactéeDepuisClassification(espèce)}>
                                        Supprimer l'espèce #{espèce.nomsScientifiques}
                                    </button>
                                </li>
                            {/each}
                        </ul>
                    </section>
                {/if}
                {#if fauneNonOiseauxÀPréremplir.size >= 1}
                    <section class="section-espèce-par-classification fr-mb-1w">
                        <h4>{`${fauneNonOiseauxÀPréremplir.size} ${fauneNonOiseauxÀPréremplir.size>=2 ? 'faunes' : 'faune'} non-oiseau`}</h4>
                        <ul>
                            {#each [...fauneNonOiseauxÀPréremplir] as espèce (espèce)}
                                <li>
                                    <NomEspèce {espèce}/> 
                                    <button type="button" class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline" onclick={() => supprimerEspèceImpactéeDepuisClassification(espèce)}>
                                        Supprimer l'espèce #{espèce.nomsScientifiques}
                                    </button>
                                </li>
                            {/each}
                        </ul>
                    </section>
                {/if}
                {#if floreÀPréremplir.size >= 1}
                    <section class="section-espèce-par-classification fr-mb-1w">
                        <h4>{`${floreÀPréremplir.size} ${floreÀPréremplir.size>=2 ? 'flores' : 'flore'}`}</h4>
                        <ul>
                            {#each [...floreÀPréremplir] as espèce (espèce)}
                                <li>
                                    <NomEspèce {espèce}/> 
                                    <button type="button" class="fr-btn fr-btn--sm fr-icon-delete-line fr-btn--tertiary-no-outline" onclick={() => supprimerEspèceImpactéeDepuisClassification(espèce)}>
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
    <DéplierReplier>
        {#snippet summary()}
            Je ne trouve pas une espèce…
        {/snippet}
        {#snippet content()}
            <p class="fr-text--sm">
                Si vous souhaitez rajouter une espèce qui ne se trouve pas dans la liste, merci d'envoyer un mail à
                <a target="_blank" href={mailtoJeNetrouvePasUneEspèce}>pitchou@beta.gouv.fr</a> en
                indiquant l'espèce concernée (nom scientifique, nom vernaculaire, <code>CD_NOM</code>).<br>
                Le <code>CD_NOM</code> est disponible sur
                <a target="_blank" href="https://inpn.mnhn.fr/accueil/recherche-de-donnees">le site de l'INPN</a>,
                en recherchant l'espèce dans la barre de recherche générale en haut de la page.<br>
                Par exemple, <a target="_blank" href="https://inpn.mnhn.fr/espece/cd_nom/4221">la Fauvette Pitchou a le <code>CD_NOM</code>
                    <code>4221</code></a>.
            </p>
        {/snippet} 
    </DéplierReplier>
</div>
<div class="fr-modal__footer">
    <button type="button" class="fr-btn fr-btn--secondary fr-ml-auto" onclick={onClickpréciserImpact}>Préciser l'impact</button>
    <button aria-controls={idModalePréremplirDepuisTexte} type="button" class="fr-btn fr-ml-2w" onclick={préremplirAvecCesEspècesImpacts}>{`Ajouter ${espècesImpactéesPourPréremplir.length} ${espècesImpactéesPourPréremplir.length>=2 ? 'espèces' : 'espèce'}`}</button>
</div>

<style>
    .section-espèce-par-classification{
        ul{
            margin: 0;
            list-style: none;
        }
        li{
            padding:0 !important;
            font-size: 0.90rem !important;
        }
        h4 {
            font-size: 1.125rem;
            margin-bottom: 0;
        }
    }
</style>