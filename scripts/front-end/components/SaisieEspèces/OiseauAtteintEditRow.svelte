<script>
    // @ts-check

    import { makeEspèceToKeywords, makeEspèceToLabel, fourchettesIndividus } from "../../espèceFieldset.js";
    import AutocompleteEspeces from "../common/HomeMadeAutocomplete.svelte"
    import CopyFileIcon from "../icons/CopyFileIcon.svelte"
    
    /** @import {OiseauAtteint, EspèceProtégée, ActivitéMenançante, MéthodeMenançante, TransportMenançant} from "../../../types/especes.js" */

    
    /**
     * @typedef {Object} Props
     * @property {EspèceProtégée | undefined} [espèce]
     * @property {ActivitéMenançante | undefined} [activité]
     * @property {MéthodeMenançante | undefined} [méthode]
     * @property {TransportMenançant | undefined} [transport]
     * @property {string | undefined} [nombreIndividus]
     * @property {number | undefined} [nombreOeufs]
     * @property {number | undefined} [nombreNids]
     * @property {number | undefined} [surfaceHabitatDétruit]
     * @property {undefined | ((f: OiseauAtteint) => void)} [onDupliquerLigne]
     * @property {undefined | ((e: EspèceProtégée) => void)} [onSupprimerLigne]
     * @property {EspèceProtégée[]} [espècesProtégéesOiseau]
     * @property {ActivitéMenançante[]} [activitésMenaçantes]
     * @property {MéthodeMenançante[]} méthodesMenaçantes
     * @property {TransportMenançant[]} transportMenaçants
     */

    /** @type {Props} */
    let {
        espèce = $bindable(undefined),
        activité = $bindable(undefined),
        méthode = $bindable(undefined),
        transport = $bindable(undefined),
        nombreIndividus = $bindable(undefined),
        nombreOeufs = $bindable(undefined),
        nombreNids = $bindable(undefined),
        surfaceHabitatDétruit = $bindable(undefined),
        onDupliquerLigne = undefined,
        onSupprimerLigne = undefined,
        espècesProtégéesOiseau = [],
        activitésMenaçantes = [],
        méthodesMenaçantes,
        transportMenaçants
    } = $props();

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
    let onSupprimerClick = $derived(onSupprimerLigne && (() => espèce && onSupprimerLigne(espèce)))
</script>

<tr>
    {#if espècesProtégéesOiseau.length >= 1}
    <td>
        <AutocompleteEspeces 
            bind:espèceSélectionnée={espèce} 
            espèces={espècesProtégéesOiseau}
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
