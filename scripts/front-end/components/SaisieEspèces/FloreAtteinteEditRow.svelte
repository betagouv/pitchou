<script>
    // @ts-check

    import { makeEspèceToKeywords, makeEspèceToLabel, fourchettesIndividus } from "../../espèceFieldset.js";
    import AutocompleteEspeces from "../common/HomeMadeAutocomplete.svelte"
    import CopyFileIcon from "../icons/CopyFileIcon.svelte"
    
    /** @import {FloreAtteinte, EspèceProtégée, ActivitéMenançante} from "../../../types/especes.js" */
    
    /**
     * @typedef {Object} Props
     * @property {EspèceProtégée | undefined} [espèce]
     * @property {ActivitéMenançante | undefined} [activité]
     * @property {string | undefined} [nombreIndividus]
     * @property {number | undefined} [surfaceHabitatDétruit]
     * @property {undefined | ((f: FloreAtteinte) => void)} [onDupliquerLigne]
     * @property {undefined | ((e: EspèceProtégée) => void)} [onSupprimerLigne]
     * @property {EspèceProtégée[]} [espècesProtégéesFlore]
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
        espècesProtégéesFlore = [],
        activitésMenaçantes = []
    } = $props();

    const espècesToKeywords = makeEspèceToKeywords(espècesProtégéesFlore)
    const espècesToLabel = makeEspèceToLabel(espècesProtégéesFlore)

    /** @param {EspèceProtégée} esp */
    const autocompleteKeywordsFunction = esp => espècesToKeywords.get(esp)

    /** @param {EspèceProtégée} esp */
    const autocompleteLabelFunction = esp => espècesToLabel.get(esp)

    const dupliquerLigne = $derived(onDupliquerLigne && (() =>  espèce && onDupliquerLigne(
        { 
            espèce,
            activité,
            nombreIndividus,
            surfaceHabitatDétruit
        },
    )))
    
    let onSupprimerClick = $derived(onSupprimerLigne && (() => espèce && onSupprimerLigne(espèce)))
</script>

<tr>
    {#if espècesProtégéesFlore.length >= 1}
    <td>
        <AutocompleteEspeces 
            bind:selectedItem={espèce} 
            espèces={espècesProtégéesFlore} 
            htmlClass="fr-input"
            labelFunction={autocompleteLabelFunction}
            keywordsFunction={autocompleteKeywordsFunction}
        />
    </td>
    {/if}
    <td>
        <select bind:value={activité} class="fr-select">
            <option value={undefined}>-</option>
            {#each activitésMenaçantes || [] as act}
            <option value={act}>
                {act['étiquette affichée']}
            </option>
            {/each}
        </select>
    </td>

    <td>
        <select bind:value={nombreIndividus} class="fr-select">
            <option value={undefined}>-</option>
            {#each fourchettesIndividus as fourchette}
                <option value={fourchette}>{fourchette}</option>
            {/each}
        </select>
    </td>

    <td>
        <input type="number" bind:value={surfaceHabitatDétruit} min="0" step="1" class="fr-input">
    </td>

    {#if onDupliquerLigne}
    <td class="icon-cell">
        <button type="button" onclick={dupliquerLigne}>
            <CopyFileIcon />
        </button>
    </td>
    {/if}

    {#if onSupprimerClick}
    <td>
        <button type="button" onclick={onSupprimerClick}>❌</button>
    </td>
    {/if}
</tr>

<style lang="scss">
    tr {
        td {
            padding: 0.2rem;

            vertical-align: top;
        }

        td:last-of-type{
            text-align: center;
            vertical-align: middle;
        }

        button{
            all: unset;
            cursor: pointer;
        }
        
        input[type="number"] {
            border-radius: 0.5em;
            padding: 0.4em;
            width: 5em;
        }

        select{
            max-width: 10rem;
        }
        
        .icon-cell {
            text-align: center;
            vertical-align: middle;

            button {
                height: 1.5rem;
                width: 1.5rem;
            }
        }
    }
</style>
