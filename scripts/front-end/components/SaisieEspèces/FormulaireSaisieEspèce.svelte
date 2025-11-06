<script>
    import { tick } from 'svelte';
    import TuileSaisieEspèce from '../SaisieEspèces/TuileSaisieEspèce.svelte'

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

        référencesEspèces = référencesEspèces.filter(e => e !== null)
        référencesEspèces[référencesEspèces.length - 1].focusFormulaireEspèce()
    }

    /**
     * @param {number} indexEspèceÀSupprimer
     */
    async function supprimerEspèce(indexEspèceÀSupprimer) {
        espècesImpactées.splice(indexEspèceÀSupprimer, 1)
        espècesImpactées = espècesImpactées

        await tick()

        référencesEspèces = référencesEspèces.filter(e => e !== null)

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

        référencesEspèces = référencesEspèces.filter(e => e !== null)

        référencesEspèces[indexEspèceÀDuppliquer + 1].réinitialiserEspèce()
        référencesEspèces[indexEspèceÀDuppliquer + 1].focusFormulaireEspèce()
    }

    /**
     * @type {TuileSaisieEspèce[]}
     */
    let référencesEspèces = $state([])

    const mailto = "mailto:pitchou@beta.gouv.fr?subject=Rajouter%20une%20esp%C3%A8ce%20prot%C3%A9g%C3%A9e%20manquante&body=Bonjour%2C%0D%0A%0D%0AJe%20souhaite%20saisir%20une%20esp%C3%A8ce%20prot%C3%A9g%C3%A9es%20qui%20n'est%20pas%20list%C3%A9e%20dans%20l'outil%20Pitchou.%0D%0AFiche%20descriptive%20de%20l'esp%C3%A8ce%20%3A%0D%0A%0D%0ANom%20vernaculaire%20%3A%0D%0ANom%20latin%20%3A%0D%0ACD_NOM%20(identifiant%20TaxRef)%20%3A%0D%0ACommentaire%20%3A%0D%0A%0D%0AJe%20vous%20remercie%20de%20bien%20vouloir%20ajouter%20cette%20esp%C3%A8ce%0D%0A%0D%0AJe%20vous%20souhaite%20une%20belle%20journ%C3%A9e%20%E2%98%80%EF%B8%8F"

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

    /**
     * @type {HTMLElement}
     */
    let modale;
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

    <button class="fr-btn fr-btn--secondary" type="button" onclick={ajouterEspèce}>
        Ajouter une espèce
    </button>
</form>

<dialog id="modale-je-ne-trouve-pas-une-espece" class="fr-modal" aria-labelledby="modale-je-ne-trouve-pas-une-espece-title" data-fr-concealing-backdrop="true" bind:this={modale}>
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
                            <a target="_blank" href={mailto}>pitchou@beta.gouv.fr</a> en
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
