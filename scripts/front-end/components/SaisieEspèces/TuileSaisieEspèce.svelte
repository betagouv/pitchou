<script>
    import { tick } from 'svelte';

    // @ts-check

    import AutocompleteEspeces from './AutocompleteEspèces.svelte'
    import ImpactEspèce from './ImpactEspèce.svelte'

    /** @import {ParClassification, EspèceProtégée, ActivitéMenançante, MéthodeMenançante, TransportMenançant, DescriptionImpact} from "../../../types/especes.js" */

    /**
     * @typedef {Object} Props
     * @property {number} [index]
     * @property {EspèceProtégée | undefined} [espèce]
     * @property {DescriptionImpact[] | undefined} [descriptionImpacts]
     * @property {undefined | ((i: DescriptionImpact[]) => void)} [onDupliquerEspèce]
     * @property {(() => Promise<void>) | undefined} [onSuprimerEspèce]
     * @property {EspèceProtégée[]} [espècesProtégées]
     * @property {ParClassification<Map<ActivitéMenançante['Identifiant Pitchou'], ActivitéMenançante>>} [activitesParClassificationEtreVivant]
     * @property {ParClassification<Map<MéthodeMenançante['Code'], MéthodeMenançante>>} méthodesParClassificationEtreVivant
     * @property {ParClassification<Map<TransportMenançant['Code'], TransportMenançant>>} transportsParClassificationEtreVivant
     */

    /** @type {Props} */
    let {
        index,
        espèce = $bindable(undefined),
        descriptionImpacts = $bindable([{}]),
        onDupliquerEspèce = undefined,
        onSuprimerEspèce = undefined,
        espècesProtégées = [],
        activitesParClassificationEtreVivant,
        méthodesParClassificationEtreVivant,
        transportsParClassificationEtreVivant,
    } = $props();


    // TODO: utilisé dans l'autocomplete, voir pour dédupliquer
    /**
     *
     * @param {EspèceProtégée} espèce
     * @returns {string}
     */
    function espèceLabel(espèce){
        return `${[...espèce.nomsVernaculaires][0]} (${[...espèce.nomsScientifiques][0]})`
    }

    async function ajouterImpact() {
        descriptionImpacts.push({})
        await tick()
        référencesImpact[référencesImpact.length - 1].focusFormulaireImpact()
    }

    /**
     * @param {number} indexImpactÀSupprimer
     */
    async function supprimerImpact(indexImpactÀSupprimer) {
        descriptionImpacts.splice(indexImpactÀSupprimer, 1)
        descriptionImpacts = descriptionImpacts
        await tick()
        référencesImpact = référencesImpact.filter(e => e !== null)

        if (descriptionImpacts.length === 0) {
            await ajouterImpact()
        } else {
            let indexImpactÀFocus = indexImpactÀSupprimer === descriptionImpacts.length
            ? descriptionImpacts.length - 1
            : indexImpactÀSupprimer

            référencesImpact[indexImpactÀFocus].focusBoutonSupprimer()
        }
    }

    export function focusBoutonSupprimer() {
        boutonSupprimer?.focus()
    }


    export function focusFormulaireEspèce() {
        autocomplete?.focus()
    }

    /**
     * @type {ImpactEspèce[]}
     */
    let référencesImpact = $state([])

    /**
     * @type {HTMLElement}
     */
    let boutonSupprimer;

    /**
     * @type {AutocompleteEspeces}
     */
    let autocomplete;


    const mailto = "mailto:pitchou@beta.gouv.fr?subject=Rajouter%20une%20esp%C3%A8ce%20prot%C3%A9g%C3%A9e%20manquante&body=Bonjour%2C%0D%0A%0D%0AJe%20souhaite%20saisir%20une%20esp%C3%A8ce%20prot%C3%A9g%C3%A9es%20qui%20n'est%20pas%20list%C3%A9e%20dans%20l'outil%20Pitchou.%0D%0AFiche%20descriptive%20de%20l'esp%C3%A8ce%20%3A%0D%0A%0D%0ANom%20vernaculaire%20%3A%0D%0ANom%20latin%20%3A%0D%0ACD_NOM%20(identifiant%20TaxRef)%20%3A%0D%0ACommentaire%20%3A%0D%0A%0D%0AJe%20vous%20remercie%20de%20bien%20vouloir%20ajouter%20cette%20esp%C3%A8ce%0D%0A%0D%0AJe%20vous%20souhaite%20une%20belle%20journ%C3%A9e%20%E2%98%80%EF%B8%8F"
</script>

<div class="tuile-espece">
    <fieldset class="fr-fieldset">
        <legend class="fr-sr-only">Espèce impactée #{index} {espèce ? espèceLabel(espèce) : 'Non selectionnée'}</legend>

        <div class="fr-fieldset__element fr-input-group fr-grid-row fr-grid-row--gutters">
            <div class="fr-col-md-4 fr-col-sm-12">
                <label class="fr-label" for="input-espece-{index}">
                    Espèce
                </label>
                <AutocompleteEspeces
                    bind:this={autocomplete}
                    bind:espèceSélectionnée={espèce}
                    espèces={espècesProtégées}
                    id={'input-espece-' + index}
                />
            </div>
            <div class="fr-col-md-4 fr-col-sm input-info">
                <a href="{mailto}">Je ne trouve pas une espèce…</a>
            </div>
            <div class="fr-col-md-4 fr-col-sm action-buttons">
                <button class="fr-btn fr-btn--secondary fr-icon-file-copy-2-line" type="button">
                    <span class="fr-sr-only">Ajouter une espèce avec les mêmes impacts que l'espèce #{index}</span>
                </button>

                <button bind:this={boutonSupprimer} onclick={onSuprimerEspèce} class="fr-btn fr-btn--secondary fr-icon-delete-line" type="button">
                    <span class="fr-sr-only">Supprimer l'espèce #{index}</span>
                </button>
            </div>
        </div>

        {#if espèce}
            {#each descriptionImpacts as impact, indexImpact (impact)}
                <hr class="fr-hr">

                <ImpactEspèce
                    bind:this={référencesImpact[indexImpact]}
                    espèce={espèce}
                    indexEspèce={index}
                    indexImpact={indexImpact + 1}
                    onSupprimerImpact={async () => { await supprimerImpact(indexImpact) }}
                    activitesParClassificationEtreVivant={activitesParClassificationEtreVivant}
                    méthodesParClassificationEtreVivant={méthodesParClassificationEtreVivant}
                    transportsParClassificationEtreVivant={transportsParClassificationEtreVivant}
                    bind:impact={descriptionImpacts[indexImpact]}
                />
            {/each}

            <hr class="fr-hr">

            <div class="fr-fieldset__element fr-input-group">
                <button class="fr-btn fr-btn--secondary" type="button" onclick={ajouterImpact}>
                    Ajouter un autre impact
                </button>
            </div>
        {/if}

    </fieldset>
</div>

<style>
    .input-info {
        display: flex;
        align-items: center;
        padding-top: 2.25rem;
    }

    .action-buttons {
        display: flex;
        gap: 16px;
        align-items: center;
        justify-content: end;
        padding-top: 2.25rem;
    }

    .tuile-espece {
        text-align: inherit;
        padding: 1rem;
        border: 1px solid var(--border-default-grey);
        border-bottom: .25rem solid var(--border-active-blue-france);
        margin-bottom: 2rem;
    }

    hr {
        width: 80%;
        margin: auto;
    }
</style>
