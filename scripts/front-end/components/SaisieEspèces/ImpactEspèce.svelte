<script>
    // @ts-check

    import { fourchettesIndividus } from "../../espèceFieldset.js";

    /** @import {ParClassification, EspèceProtégée, ActivitéMenançante, MéthodeMenançante, TransportMenançant} from "../../../types/especes.js" */

    /**
     * @typedef {Object} Props
     * @property {number} [indexEspèce]
     * @property {number} [indexImpact]
     * @property {ActivitéMenançante | undefined} [activité]
     * @property {MéthodeMenançante | undefined} [méthode]
     * @property {TransportMenançant | undefined} [transport]
     * @property {string | undefined} [nombreIndividus]
     * @property {number | undefined} [nombreNids]
     * @property {number | undefined} [nombreOeufs]
     * @property {number | undefined} [surfaceHabitatDétruit]
     * @property {EspèceProtégée} [espèce]
     * @property {ParClassification<Map<ActivitéMenançante['Identifiant Pitchou'], ActivitéMenançante>>} [activitesParClassificationEtreVivant]
     * @property {ParClassification<Map<MéthodeMenançante['Code'], MéthodeMenançante>>} méthodesParClassificationEtreVivant
     * @property {ParClassification<Map<TransportMenançant['Code'], TransportMenançant>>} transportsParClassificationEtreVivant
     */

    /** @type {Props} */
    let {
        indexEspèce,
        indexImpact,
        activité = $bindable(undefined),
        méthode = $bindable(undefined),
        transport = $bindable(undefined),
        nombreIndividus = $bindable(undefined),
        nombreNids = $bindable(undefined),
        nombreOeufs = $bindable(undefined),
        surfaceHabitatDétruit = $bindable(undefined),
        espèce,
        activitesParClassificationEtreVivant,
        méthodesParClassificationEtreVivant,
        transportsParClassificationEtreVivant,
    } = $props();

    let activitésMenaçantes = $derived(
        espèce && activitesParClassificationEtreVivant
        ? [...activitesParClassificationEtreVivant[espèce.classification].values()]
        : []
    )

    let méthodeMenaçantes = $derived(
        espèce && méthodesParClassificationEtreVivant
        ? [...méthodesParClassificationEtreVivant[espèce.classification].values()]
        : []
    )

    let transportMenaçants = $derived(
        espèce && transportsParClassificationEtreVivant
        ? [...transportsParClassificationEtreVivant[espèce.classification].values()]
        : []
    )
</script>

<hr class="fr-hr">

<fieldset class="fr-fieldset fr-input-group fr-fieldset__element">
    <legend class="fr-sr-only">Impact #{indexImpact} de l’espèce #{indexEspèce}</legend>

    <div class="fr-fieldset__element fr-input-group fr-grid-row fr-grid-row--gutters">
        <div class="fr-col-4">
            <label class="fr-label" for="input-espece-{indexEspèce}-impact-{indexImpact}">
                Type d’impact
            </label>
            <select bind:value={activité} class="fr-select" id="input-espece-{indexEspèce}-impact-{indexImpact}">
                <option value={undefined}>-</option>
                {#each activitésMenaçantes as act}
                <option value={act}>
                    {act['Libellé Pitchou']}
                </option>
                {/each}
            </select>
        </div>

        {#if activité && activité['Méthode'] === 'Oui'}
            <div class="fr-col-4">
                <label class="fr-label" for="input-espece-{indexEspèce}-methode-{indexImpact}">
                    Méthode
                </label>
                <select bind:value={méthode} class="fr-select" id="input-espece-{indexEspèce}-methode-{indexImpact}">
                    <option value={undefined}>-</option>
                    {#each méthodeMenaçantes as met}
                    <option value={met}>
                        {met['Libellé Pitchou']}
                    </option>
                    {/each}
                </select>
            </div>
        {/if}

        {#if activité && activité['Moyen de poursuite'] === 'Oui'}
            <div class="fr-col-4">
                <label class="fr-label" for="input-espece-{indexEspèce}-moyen-de-poursuite-{indexImpact}">
                    Moyen de poursuite
                </label>
                <select bind:value={transport} class="fr-select" id="input-espece-{indexEspèce}-moyen-de-poursuite-{indexImpact}">
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

    {#if activité}
        <div class="fr-fieldset__element fr-input-group fr-grid-row fr-grid-row--gutters">
            {#if activité["Nombre d'individus"] === 'Oui'}
                <div class="fr-col">
                    <label class="fr-label" for="input-espece-{indexEspèce}-nombre-individus-{indexImpact}">
                        Nombre d’individus
                    </label>
                    <select bind:value={nombreIndividus} class="fr-select" id="input-espece-{indexEspèce}-nombre-individus-{indexImpact}">
                        <option value="{undefined}">-</option>
                        {#each fourchettesIndividus as fourchette}
                            <option value={fourchette}>{fourchette}</option>
                        {/each}
                    </select>
                </div>
            {/if}

            {#if activité['Nids'] === 'Oui'}
                <div class="fr-col">
                    <label class="fr-label" for="input-espece-{indexEspèce}-nids-{indexImpact}">
                        Nids
                    </label>
                    <input type="number" bind:value={nombreNids} min="0" step="1" class="fr-input" id="input-espece-{indexEspèce}-nids-{indexImpact}">
                </div>
            {/if}

            {#if activité['Œufs'] === 'Oui'}
                <div class="fr-col">
                    <label class="fr-label" for="input-espece-{indexEspèce}-oeufs-{indexImpact}">
                        Œufs
                    </label>
                    <input type="number" bind:value={nombreOeufs} min="0" step="1" class="fr-input" id="input-espece-{indexEspèce}-oeufs-{indexImpact}">
                </div>
            {/if}

            {#if activité['Surface habitat détruit (m²)'] === 'Oui'}
                <div class="fr-col">
                    <label class="fr-label" for="input-espece-{indexEspèce}-surface-{indexImpact}">
                        Surface habitat détruit (m²)
                    </label>
                    <input type="number" bind:value={surfaceHabitatDétruit} min="0" step="1" class="fr-input" id="input-espece-{indexEspèce}-surface-{indexImpact}">
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

    hr {
        width: 80%;
        margin: auto;
    }
</style>
