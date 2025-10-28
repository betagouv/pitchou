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
     * @property {DescriptionImpact[]} [descriptionImpacts]
     * @property {undefined | ((i: DescriptionImpact[]) => void)} [onDupliquerEspèce]
     * @property {undefined | ((e: EspèceProtégée) => void)} [onSuprimerEspèce]
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

        if (référencesImpact[indexImpactÀSupprimer]) {
            référencesImpact
        }

        if (descriptionImpacts.length === 0) {
            ajouterImpact()
        } else {
            let indexImpactÀFocus = indexImpactÀSupprimer === descriptionImpacts.length
            ? descriptionImpacts.length - 1
            : indexImpactÀSupprimer

            référencesImpact[indexImpactÀFocus].focusBoutonSupprimer()
        }
    }

    /**
     * @type {ImpactEspèce[]}
     */
    let référencesImpact = $state([])
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
                    bind:espèceSélectionnée={espèce}
                    espèces={espècesProtégées}
                    id={'input-espece-' + index}
                />
            </div>
            <div class="fr-col-md-4 fr-col-sm input-info">
                <a href="#">Je ne trouve pas une espèce…</a>
            </div>
            <div class="fr-col-md-4 fr-col-sm action-buttons">
                <button class="fr-btn fr-btn--secondary fr-icon-file-copy-2-line" type="button">
                    <span class="fr-sr-only">Ajouter une espèce avec les mêmes impacts que l'espèce #{index}</span>
                </button>

                <button class="fr-btn fr-btn--secondary fr-icon-delete-line" type="button">
                    <span class="fr-sr-only">Supprimer l'espèce #{index}</span>
                </button>
            </div>
        </div>

        {#if espèce}
            {#each descriptionImpacts as impact, indexImpact (impact)}
                <hr class="fr-hr">

                <ImpactEspèce
                    espèce={espèce}
                    indexEspèce={index}
                    indexImpact={indexImpact + 1}
                    onSupprimerImpact={async () => supprimerImpact(indexImpact)}
                    activitesParClassificationEtreVivant={activitesParClassificationEtreVivant}
                    méthodesParClassificationEtreVivant={méthodesParClassificationEtreVivant}
                    transportsParClassificationEtreVivant={transportsParClassificationEtreVivant}
                    bind:impact={descriptionImpacts[indexImpact]}
                    bind:this={référencesImpact[indexImpact]}
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
    }

    hr {
        width: 80%;
        margin: auto;
    }
</style>
