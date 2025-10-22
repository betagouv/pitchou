<script>
    // @ts-check

    import AutocompleteEspeces from './AutocompleteEspèces.svelte'

    /** @import {FloreAtteinte, EspèceProtégée, ActivitéMenançante} from "../../../types/especes.js" */

    /**
     * @typedef {Object} Props
     * @property {EspèceProtégée | undefined} [espèce]
     * @property {number} [index]
     * @property {ActivitéMenançante | undefined} [activité]
     * @property {string | undefined} [nombreIndividus]
     * @property {number | undefined} [surfaceHabitatDétruit]
     * @property {undefined | ((f: FloreAtteinte) => void)} [onDupliquerTuile]
     * @property {undefined | ((e: EspèceProtégée) => void)} [onSupprimerTuile]
     * @property {EspèceProtégée[]} [espècesProtégées]
     * @property {ActivitéMenançante[]} [activitésMenaçantes]
     */

    /** @type {Props} */
    let {
        espèce = $bindable(undefined),
        activité = $bindable(undefined),
        nombreIndividus = $bindable(undefined),
        surfaceHabitatDétruit = $bindable(undefined),
        onDupliquerLigne = undefined,
        onSupprimerLigne = undefined,
        espècesProtégées = [],
        activitésMenaçantes = [],
        index
    } = $props();

    // TODO: utilié dans l'autocomplete, voir pour dédupliquer
    /**
     *
     * @param {EspèceProtégée} espèce
     * @returns {string}
     */
    function espèceLabel(espèce){
        return `${[...espèce.nomsVernaculaires][0]} (${[...espèce.nomsScientifiques][0]})`
    }
</script>

<div class="tuile-espece">
    <fieldset class="fr-fieldset">
        <legend class="fr-sr-only">Espèce impactée #{index} {espèce ? espèceLabel(espèce) : 'Non selectionnée'}</legend>

        <div class="fr-fieldset__element fr-grid-row fr-grid-row--gutters">
            <div class="fr-input-group fr-col-4">
                <label class="fr-label" for="input-espece-{index}">
                    Espèce
                </label>
                <AutocompleteEspeces
                    bind:espèceSélectionnée={espèce}
                    espèces={espècesProtégées}
                    id={'input-espece-' + index}
                />
            </div>
            <div class="fr-col-4 input-info">
                <a href="#">Je ne trouve pas une espèce…</a>
            </div>
            <div class="fr-col-4 action-buttons">
                <button class="fr-btn fr-btn--secondary fr-icon-file-copy-2-line" type="button">
                    <span class="fr-sr-only">Dupliquer l'espèce #{index}</span>
                </button>

                <button class="fr-btn fr-btn--secondary fr-icon-delete-line" type="button">
                    <span class="fr-sr-only">Supprimer l'espèce #{index}</span>
                </button>
            </div>
        </div>

        <hr>

        <div class="fr-fieldset__element fr-grid-row fr-grid-row--gutters">
            <div class="fr-input-group fr-col-4">
                <label class="fr-label" for="input-impact-{index}">
                    Type d’impact
                </label>
                <select class="fr-select" id="input-impact-{index}">
                </select>
            </div>

            <div class="fr-input-group fr-col-4">
                <label class="fr-label" for="input-methode-{index}">
                    Méthode
                </label>
                <select class="fr-select" id="input-methode-{index}">
                </select>
            </div>

            <div class="fr-input-group fr-col-4">
                <label class="fr-label" for="input-moyen-de-poursuite-{index}">
                    Moyen de poursuite
                </label>
                <select class="fr-select" id="input-moyen-de-poursuite-{index}">
                </select>
            </div>
        </div>
    </fieldset>
</div>

<style>
    .input-info {
        display: flex;
        align-items: center;
    }

    .action-buttons {
        display: flex;
        gap: 16px;
        align-items: center;
        justify-content: end;
    }


    .tuile-espece {
        text-align: inherit;
        padding: 1rem;
        border: 1px solid var(--border-default-grey);
        border-bottom: .25rem solid var(--border-active-blue-france);
    }
</style>
