<script>
    import { tick } from 'svelte';

    // @ts-check

    import AutocompleteEspeces from './AutocompleteEspèces.svelte'
    import ImpactEspèce from './ImpactEspèce.svelte'
    import { espèceLabel } from '../../../commun/outils-espèces.js'

    /** @import {ParClassification, EspèceProtégée, ActivitéMenançante, MéthodeMenançante, TransportMenançant, DescriptionImpact, ClassificationEtreVivant} from "../../../types/especes.js" */

    /**
     * @typedef {Object} Props
     * @property {number} [index]
     * @property {string} [idModaleEspèceNonTrouvée]
     * @property {EspèceProtégée | undefined} [espèce]
     * @property {DescriptionImpact[] | undefined} [descriptionImpacts]
     * @property {(() => Promise<void>) | undefined} [onDupliquerEspèce]
     * @property {((e: Event) => void) | undefined} [onOuvertureModale]
     * @property {(() => Promise<void>) | undefined} [onSuprimerEspèce]
     * @property {EspèceProtégée[]} [espècesProtégées]
     * @property {ParClassification<Map<ActivitéMenançante['Identifiant Pitchou'], ActivitéMenançante>>} [activitesParClassificationEtreVivant]
     * @property {ParClassification<Map<MéthodeMenançante['Code'], MéthodeMenançante>>} méthodesParClassificationEtreVivant
     * @property {ParClassification<Map<TransportMenançant['Code'], TransportMenançant>>} transportsParClassificationEtreVivant
     */

    /** @type {Props} */
    let {
        index,
        idModaleEspèceNonTrouvée,
        espèce = $bindable(undefined),
        descriptionImpacts = $bindable([{}]),
        onOuvertureModale = undefined,
        onDupliquerEspèce = undefined,
        onSuprimerEspèce = undefined,
        espècesProtégées = [],
        activitesParClassificationEtreVivant,
        méthodesParClassificationEtreVivant,
        transportsParClassificationEtreVivant,
    } = $props();

    /**
     * @type ClassificationEtreVivant | undefined
     */
    let espèceClassification = $state(espèce?.classification)

    async function ajouterImpact() {
        descriptionImpacts.push({})

        await tick()

        référencesImpact = référencesImpact.filter(e => e !== null)
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


    export function réinitialiserEspèce() {
        espèce = undefined;
    }

    /**
     *
     * @param {EspèceProtégée} nouvelleEspèce
     */
    function onChangeEspèce(nouvelleEspèce) {
        if (nouvelleEspèce.classification !== espèceClassification) {
            descriptionImpacts = [{}]
        }

        espèceClassification = nouvelleEspèce.classification
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

</script>

<div class="tuile-espece">
    <fieldset class="fr-fieldset">
        <legend class="fr-sr-only">Espèce impactée #{index} {espèce ? espèceLabel(espèce) : 'Non selectionnée'}</legend>

        <div class="fr-fieldset__element fr-input-group fr-grid-row fr-grid-row--gutters">
            <div class="fr-col-md-4 fr-col-12">
                <label class="fr-label" for="input-espece-{index}">
                    Espèce
                </label>
                <AutocompleteEspeces
                    bind:this={autocomplete}
                    onChange={onChangeEspèce}
                    bind:espèceSélectionnée={espèce}
                    espèces={espècesProtégées}
                    id={'input-espece-' + index}
                />
            </div>
            {#if idModaleEspèceNonTrouvée}
                <div class="fr-col-md-4 fr-col input-info">
                    <button aria-controls="{idModaleEspèceNonTrouvée}" data-fr-opened="false" type="button" class="fr-btn fr-btn--sm fr-btn--tertiary" onclick={onOuvertureModale}>Je ne trouve pas une espèce…</button>
                </div>
            {/if}
            <div class="fr-col-md-4 fr-col action-buttons">
                {#if onDupliquerEspèce}
                    <button onclick={onDupliquerEspèce} class="fr-btn fr-btn--secondary fr-icon-file-copy-2-line" type="button">
                        <span class="fr-sr-only">Ajouter une espèce avec les mêmes impacts que l'espèce #{index}</span>
                    </button>
                {/if}
                <button bind:this={boutonSupprimer} onclick={onSuprimerEspèce} class="fr-btn fr-btn--secondary fr-icon-delete-line" type="button">
                    <span class="fr-sr-only">Supprimer l'espèce #{index}</span>
                </button>
            </div>
        </div>

        {#if espèceClassification}
            {#each descriptionImpacts as impact, indexImpact (impact)}
                <hr class="fr-hr">

                <ImpactEspèce
                    bind:this={référencesImpact[indexImpact]}
                    espèce={espèce}
                    espèceClassification={espèceClassification}
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

            <div class="fr-fieldset__element fr-input-group container-ajouter-impact">
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

    .container-ajouter-impact {
        margin-bottom: 0;
    }

    hr {
        width: 80%;
        margin: auto;
    }
</style>
