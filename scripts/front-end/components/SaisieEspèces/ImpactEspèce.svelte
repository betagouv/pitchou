<script>
    // @ts-check

    import { fourchettesIndividus } from "../../espèceFieldset.js";

    /** @import {ParClassification, DescriptionImpact, EspèceProtégée, ActivitéMenançante, MéthodeMenançante, TransportMenançant, ClassificationEtreVivant} from "../../../types/especes.js" */

    /**
     * @typedef {Object} Props
     * @property {number} [indexEspèce]
     * @property {number} [indexImpact]
     * @property {DescriptionImpact} [impact]
     * @property {(() => Promise<void>)} [onSupprimerImpact]
     * @property {EspèceProtégée} [espèce]
     * @property {ClassificationEtreVivant} [espèceClassification]
     * @property {ParClassification<Map<ActivitéMenançante['Identifiant Pitchou'], ActivitéMenançante>>} [activitesParClassificationEtreVivant]
     * @property {ParClassification<Map<MéthodeMenançante['Code'], MéthodeMenançante>>} méthodesParClassificationEtreVivant
     * @property {ParClassification<Map<TransportMenançant['Code'], TransportMenançant>>} transportsParClassificationEtreVivant
     */

    /** @type {Props} */
    let {
        indexEspèce,
        indexImpact,
        impact = $bindable({}),
        onSupprimerImpact,
        espèce,
        espèceClassification = espèce?.classification,
        activitesParClassificationEtreVivant,
        méthodesParClassificationEtreVivant,
        transportsParClassificationEtreVivant,
    } = $props();

    let activitésMenaçantes = $derived(
        espèceClassification && activitesParClassificationEtreVivant
        ? [...activitesParClassificationEtreVivant[espèceClassification].values()]
        : []
    )

    let méthodeMenaçantes = $derived(
        espèceClassification && méthodesParClassificationEtreVivant
        ? [...méthodesParClassificationEtreVivant[espèceClassification].values()]
        : []
    )

    let transportMenaçants = $derived(
        espèceClassification && transportsParClassificationEtreVivant
        ? [...transportsParClassificationEtreVivant[espèceClassification].values()]
        : []
    )

    export function focusBoutonSupprimer() {
        boutonSupprimer?.focus()
    }

    export function focusFormulaireImpact() {
        selectImpact?.focus()
    }

    function réinitialiserDétailsImpact() {
        impact.méthode = undefined
        impact.transport = undefined
        impact.nombreIndividus = undefined
        impact.surfaceHabitatDétruit = undefined
        impact.nombreNids = undefined
        impact.nombreOeufs = undefined
    }

    /**
     * @type {HTMLElement | undefined}
     */
    let boutonSupprimer = $state();

    /**
     * @type {HTMLElement}
     */
    let selectImpact;
</script>

<fieldset class="fr-fieldset fr-input-group fr-fieldset__element">
    {#if indexImpact && indexEspèce}
        <legend class="fr-sr-only">Impact #{indexImpact} de l’espèce #{indexEspèce}</legend>
    {:else}
        <legend class="fr-sr-only">Impact sur l'espèce {espèceClassification}</legend>
    {/if}
    <div class="fr-fieldset__element fr-input-group fr-grid-row fr-grid-row--gutters">
        <div class="fr-col-md-5 fr-col-12">
            <label class="fr-label" for="input-espece-{indexEspèce}-impact-{indexImpact}">
                Type d’impact
            </label>
            <div class="input-button">
                <select bind:this={selectImpact} bind:value={impact.activité} onchange={réinitialiserDétailsImpact} class="fr-select" id="input-espece-{indexEspèce}-impact-{indexImpact}">
                    <option value={undefined}>-</option>
                    {#each activitésMenaçantes as act}
                    <option value={act}>
                        {act['Libellé Pitchou']}
                    </option>
                    {/each}
                </select>
                {#if onSupprimerImpact}
                    <button class="fr-btn fr-btn--secondary fr-icon-delete-line" type="button" bind:this={boutonSupprimer} onclick={onSupprimerImpact}>
                        <span class="fr-sr-only">Supprimer l'impact #{indexImpact} de l'espèce #{indexEspèce}</span>
                    </button>
                {/if}
            </div>
        </div>

        {#if impact.activité && impact.activité['Méthode'] === 'Oui'}
            <div class="fr-col-md-4 fr-col-12">
                <label class="fr-label" for="input-espece-{indexEspèce}-methode-{indexImpact}">
                    Méthode
                </label>
                <select bind:value={impact.méthode} class="fr-select" id="input-espece-{indexEspèce}-methode-{indexImpact}">
                    <option value={undefined}>-</option>
                    {#each méthodeMenaçantes as met}
                    <option value={met}>
                        {met['Libellé Pitchou']}
                    </option>
                    {/each}
                </select>
            </div>
        {/if}

        {#if impact.activité && impact.activité['Moyen de poursuite'] === 'Oui'}
            <div class="fr-col-md-3 fr-col-12">
                <label class="fr-label" for="input-espece-{indexEspèce}-moyen-de-poursuite-{indexImpact}">
                    Moyen de poursuite
                </label>
                <select bind:value={impact.transport} class="fr-select" id="input-espece-{indexEspèce}-moyen-de-poursuite-{indexImpact}">
                    <option value={undefined}>-</option>
                    {#each transportMenaçants as trans}
                    <option value={trans}>
                        {trans['Libellé Pitchou']}
                    </option>
                    {/each}
                </select>
            </div>
        {/if}
    </div>

    {#if impact.activité}
        <div class="fr-fieldset__element fr-input-group fr-grid-row fr-grid-row--gutters">
            {#if impact.activité["Nombre d'individus"] === 'Oui'}
                <div class="fr-col-md-3 fr-col-12">
                    <label class="fr-label" for="input-espece-{indexEspèce}-nombre-individus-{indexImpact}">
                        Nombre d’individus
                    </label>
                    <select bind:value={impact.nombreIndividus} class="fr-select" id="input-espece-{indexEspèce}-nombre-individus-{indexImpact}">
                        <option value="{undefined}">-</option>
                        {#each fourchettesIndividus as fourchette}
                            <option value={fourchette}>{fourchette}</option>
                        {/each}
                    </select>
                </div>
            {/if}

            {#if impact.activité['Nids'] === 'Oui'}
                <div class="fr-col-md-3 fr-col-12">
                    <label class="fr-label" for="input-espece-{indexEspèce}-nids-{indexImpact}">
                        Nids
                    </label>
                    <input type="number" bind:value={impact.nombreNids} min="0" step="1" class="fr-input" id="input-espece-{indexEspèce}-nids-{indexImpact}">
                </div>
            {/if}

            {#if impact.activité['Œufs'] === 'Oui'}
                <div class="fr-col-md-3 fr-col-12">
                    <label class="fr-label" for="input-espece-{indexEspèce}-oeufs-{indexImpact}">
                        Œufs
                    </label>
                    <input type="number" bind:value={impact.nombreOeufs} min="0" step="1" class="fr-input" id="input-espece-{indexEspèce}-oeufs-{indexImpact}">
                </div>
            {/if}

            {#if impact.activité['Surface habitat détruit (m²)'] === 'Oui'}
                <div class="fr-col-md-3 fr-col-12">
                    <label class="fr-label" for="input-espece-{indexEspèce}-surface-{indexImpact}">
                        Surface habitat détruit (m²)
                    </label>
                    <input type="number" bind:value={impact.surfaceHabitatDétruit} min="0" step="1" class="fr-input" id="input-espece-{indexEspèce}-surface-{indexImpact}">
                </div>
            {/if}
        </div>
    {/if}
</fieldset>

<style>
    fieldset {
        margin: 0;
        padding: 0;
    }

    .input-button {
        display: flex;
        margin-top: .5rem;
        gap: 1rem;
    }

    @media (min-width: 62em) {
        .input-button {
            gap: 1.5rem;
        }
    }
</style>
