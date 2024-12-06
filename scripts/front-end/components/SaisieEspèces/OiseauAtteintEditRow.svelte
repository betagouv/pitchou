<script>
    // @ts-check

    import { makeEspèceToKeywords, makeEspèceToLabel, fourchettesIndividus } from "../../espèceFieldset.js";
    import AutocompleteEspeces from "../AutocompleteEspèces.svelte"
    import CopyFileIcon from "../icons/CopyFileIcon.svelte"
    
    /** @import {OiseauAtteint, EspèceProtégée, ActivitéMenançante, MéthodeMenançante, TransportMenançant} from "../../../types/especes.js" */

    /** @type {EspèceProtégée | undefined} */
    export let espèce = undefined
    /** @type {ActivitéMenançante | undefined} */
    export let activité = undefined
    /** @type {MéthodeMenançante | undefined} */
    export let méthode = undefined
    /** @type {TransportMenançant | undefined} */
    export let transport = undefined 
    /** @type {string | undefined} */
    export let nombreIndividus = undefined 
    /** @type {number | undefined} */
    export let nombreOeufs = undefined 
    /** @type {number | undefined} */
    export let nombreNids = undefined 
    /** @type {number | undefined} */
    export let surfaceHabitatDétruit = undefined 

    /** @type {undefined | ((f: OiseauAtteint) => void)} */
    export let onDupliquerLigne = undefined

    /** @type {undefined | ((e: EspèceProtégée) => void)} */
    export let onSupprimerLigne = undefined
    $: onSupprimerClick = onSupprimerLigne && espèce && (() => onSupprimerLigne(espèce))

    /** @type {EspèceProtégée[]} */
    export let espècesProtégéesOiseau = []

    /** @type {ActivitéMenançante[]} */
    export let activitésMenaçantes = []

    /** @type {MéthodeMenançante[]} */
    export let méthodesMenaçantes

    /** @type {TransportMenançant[]} */
    export let transportMenaçants

    const espècesToKeywords = makeEspèceToKeywords(espècesProtégéesOiseau)
    const espècesToLabel = makeEspèceToLabel(espècesProtégéesOiseau)

    /** @param {EspèceProtégée} esp */
    const autocompleteKeywordsFunction = esp => espècesToKeywords.get(esp)

    /** @param {EspèceProtégée} esp */
    const autocompleteLabelFunction = esp => espècesToLabel.get(esp)

    const dupliquerLigne = onDupliquerLigne && (() => {
        if(espèce){
            onDupliquerLigne({
                espèce,  
                activité,
                méthode,
                transport,
                nombreIndividus,
                nombreNids,
                nombreOeufs,
                surfaceHabitatDétruit
            })
        }
    })
</script>

<tr>
    {#if espècesProtégéesOiseau.length >= 1}
    <td>
        <AutocompleteEspeces 
            bind:selectedItem={espèce} 
            espèces={espècesProtégéesOiseau} 
            htmlClass="fr-input"
            labelFunction={autocompleteLabelFunction}
            keywordsFunction={autocompleteKeywordsFunction}
        />
    </td>
    {/if}

    <td>
        <select bind:value={activité} class="fr-select">
            <option value={undefined}>-</option>
            {#each activitésMenaçantes as act}
            <option value={act}>
                {act['étiquette affichée']}
            </option>
            {/each}
        </select>
    </td>

    <td>
        <select bind:value={méthode} disabled={activité && activité['Méthode'] === 'n'} class="fr-select">
            <option value="{undefined}">-</option>
            {#each méthodesMenaçantes as met}
                <option value={met}>{met['étiquette affichée']}</option>
            {/each}
        </select>
    </td>

    <td>
        <select bind:value={transport} disabled={activité && activité['transport'] === 'n'} class="fr-select">
            <option value="{undefined}">-</option>
            {#each transportMenaçants as trans}
                <option value={trans}>{trans['étiquette affichée']}</option>
            {/each}
        </select>
    </td>

    <td>
        <select bind:value={nombreIndividus} class="fr-select">
            <option value="{undefined}">-</option>
            {#each fourchettesIndividus as fourchette}
                <option value={fourchette}>{fourchette}</option>
            {/each}
        </select>
    </td>

    <td>
        <input type="number" bind:value={nombreNids} min="0" step="1" class="fr-input">
    </td>

    <td>
        <input type="number" bind:value={nombreOeufs} min="0" step="1" class="fr-input">
    </td>

    <td>
        <input type="number" bind:value={surfaceHabitatDétruit} min="0" step="1" class="fr-input">
    </td>

    {#if onDupliquerLigne}
    <td class="icon-cell">
        <button type="button" on:click={dupliquerLigne}>
            <CopyFileIcon />
        </button>
    </td>
    {/if}

    {#if onSupprimerClick}
    <td>
        <button type="button" on:click={onSupprimerClick}>❌</button>
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
