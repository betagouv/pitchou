<script>
    import { tick } from 'svelte';
    import TuileSaisieEspèce from '../SaisieEspèces/TuileSaisieEspèce.svelte'
	import { mailtoJeNetrouvePasUneEspèce } from '../../../commun/constantes.js'

    /** @import {ParClassification, EspèceProtégée, DescriptionImpact, ActivitéMenançante, MéthodeMenançante, TransportMenançant} from "../../../types/especes.js" */


    /**
     * @typedef {Object} Props
     * @property {number} [index]
     * @property {Array<{ espèce?: EspèceProtégée, impacts?: DescriptionImpact[] }>} [espècesImpactées]
     * @property {EspèceProtégée[]} [espècesProtégées]
     * @property {ParClassification<Map<ActivitéMenançante['Identifiant Pitchou'], ActivitéMenançante>>} [activitesParClassificationEtreVivant]
     * @property {ParClassification<Map<MéthodeMenançante['Code'], MéthodeMenançante>>} méthodesParClassificationEtreVivant
     * @property {ParClassification<Map<TransportMenançant['Code'], TransportMenançant>>} transportsParClassificationEtreVivant
     */

    /** @type {Props} */
    let {
        espècesImpactées = $bindable([{impacts: [{}]}]),
        espècesProtégées = [],
        activitesParClassificationEtreVivant,
        méthodesParClassificationEtreVivant,
        transportsParClassificationEtreVivant,
    } = $props();

    async function ajouterEspèce() {
        espècesImpactées.push({
            impacts: [{}]
        })

        await tick()

        référencesEspèces = référencesEspèces.filter(ref => ref !== null)
        référencesEspèces[référencesEspèces.length - 1].focusFormulaireEspèce()
    }

    /**
     * @param {number} indexEspèceÀSupprimer
     */
    async function supprimerEspèce(indexEspèceÀSupprimer) {
        espècesImpactées.splice(indexEspèceÀSupprimer, 1)

        await tick()

        // Quand une référence disparaît, elle est mise à "null" par Svelte et n'est pas supprimée du tableau
        référencesEspèces = référencesEspèces.filter(ref => ref !== null)

        if (espècesImpactées.length === 0) {
            await ajouterEspèce()
        } else {
            let indexEspèceÀFocus = indexEspèceÀSupprimer === espècesImpactées.length
            ? espècesImpactées.length - 1
            : indexEspèceÀSupprimer

            référencesEspèces[indexEspèceÀFocus].focusBoutonSupprimer()
        }
    }

    /**
     * @param {number} indexEspèceÀDuppliquer
     */
    async function duppliquerEspèce(indexEspèceÀDuppliquer) {
        const nouvelleEspèceImpactée = {
            espèce: espècesImpactées[indexEspèceÀDuppliquer].espèce,
            impacts: espècesImpactées[indexEspèceÀDuppliquer].impacts?.map(i => Object.assign({}, i))
        }
        espècesImpactées.splice(indexEspèceÀDuppliquer + 1, 0, nouvelleEspèceImpactée)

        await tick()

        référencesEspèces = référencesEspèces.filter(ref => ref !== null)

        référencesEspèces[indexEspèceÀDuppliquer + 1].réinitialiserEspèce()
        référencesEspèces[indexEspèceÀDuppliquer + 1].focusFormulaireEspèce()
    }

    /**
     * @type {TuileSaisieEspèce[]}
     */
    let référencesEspèces = $state([])

    /**
     * @param {Event} e
     */
    function onOuvertureModale(e) {
        // @ts-ignore EventTarget est un HTMLElement dans ce cas-ci
        modaleButton = e.target;
    }

    function onFermetureModale() {
        if (modaleButton) {
            modaleButton.focus()
        }
    }

    /**
     * @type {HTMLElement | null}
     */
    let modaleButton;
</script>

<form class="fr-mb-4w">
    {#each espècesImpactées as espècesImpactée, indexEspècesImpactée (espècesImpactée)}
        <TuileSaisieEspèce
            bind:this={référencesEspèces[indexEspècesImpactée]}
            index={indexEspècesImpactée + 1}
            idModaleEspèceNonTrouvée="modale-je-ne-trouve-pas-une-espece"
            bind:espèce={espècesImpactées[indexEspècesImpactée].espèce}
            bind:descriptionImpacts={espècesImpactées[indexEspècesImpactée].impacts}
            onOuvertureModale={onOuvertureModale}
            onSuprimerEspèce={async () => {await supprimerEspèce(indexEspècesImpactée) }}
            onDupliquerEspèce={async () => { await duppliquerEspèce(indexEspècesImpactée) }}
            espècesProtégées={espècesProtégées}
            activitesParClassificationEtreVivant={activitesParClassificationEtreVivant}
            méthodesParClassificationEtreVivant={méthodesParClassificationEtreVivant}
            transportsParClassificationEtreVivant={transportsParClassificationEtreVivant}
        />
    {/each}

    <div class="fr-grid-row">
        <button class="fr-btn fr-btn--secondary fr-m-auto" type="button" onclick={ajouterEspèce}>
            Ajouter une espèce
        </button>
    </div>
</form>

<dialog id="modale-je-ne-trouve-pas-une-espece" class="fr-modal" aria-labelledby="modale-je-ne-trouve-pas-une-espece-title" data-fr-concealing-backdrop="true">
    <div class="fr-container fr-container--fluid fr-container-md">
        <div class="fr-grid-row fr-grid-row--center">
            <div class="fr-col-12 fr-col-md-10 fr-col-lg-8">
                <div class="fr-modal__body">
                    <div class="fr-modal__header">
                        <button aria-controls="modale-je-ne-trouve-pas-une-espece" title="Fermer" type="button" class="fr-btn--close fr-btn" onclick={onFermetureModale}>Fermer</button>
                    </div>
                    <div class="fr-modal__content">
                        <h2 id="modale-je-ne-trouve-pas-une-espece" class="fr-modal__title">
                            Je ne trouve pas une espèce que je veux saisir
                        </h2>
                        <p class="fr-callout__text">
                            Si vous souhaitez rajouter une espèce qui ne se trouve pas dans la liste, merci d'envoyer un mail à
                            <a target="_blank" href={mailtoJeNetrouvePasUneEspèce}>pitchou@beta.gouv.fr</a> en
                            indiquant l'espèce concernée (nom scientifique, nom vernaculaire, <code>CD_NOM</code>).<br>
                            Le <code>CD_NOM</code> est disponible sur
                            <a target="_blank" href="https://inpn.mnhn.fr/accueil/recherche-de-donnees">le site de l'INPN</a>,
                            en recherchant l'espèce dans la barre de recherche générale en haut de la page.<br>
                            Par exemple, <a target="_blank" href="https://inpn.mnhn.fr/espece/cd_nom/4221">la Fauvette Pitchou a le <code>CD_NOM</code>
                                <code>4221</code></a>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</dialog>
