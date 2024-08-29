<script>
    // @ts-check

    import { makeEspèceToKeywords, makeEspèceToLabel } from "../../precalculsAutocompleteEspèces.js";
    import AutocompleteEspeces from "../AutocompleteEspèces.svelte"
    
    /** @import {EtreVivantAtteint, OiseauAtteint, EspèceProtégée, ActivitéMenançante, MéthodeMenançante, TransportMenançant} from "../../../types.js" */

    /** @type {OiseauAtteint} */
    export let oiseauAtteint

    /** @type {OiseauAtteint[]} */
    export let oiseauxAtteints

    /** @type {EspèceProtégée[]} */
    export let espècesProtégéesOiseau

    /** @type {ActivitéMenançante[]} */
    export let activitésMenaçantes

    /** @type {MéthodeMenançante[]} */
    export let méthodesMenaçantes

    /** @type {TransportMenançant[]} */
    export let transportMenaçants
    
    /** @param {EtreVivantAtteint[]} etresVivantsAtteints
      * @param {EspèceProtégée} _espèce 
      */
    export let supprimerLigne

    /** @type {string[]}*/
    export let fourchettesIndividus = [
        '0-10',
        '11-100',
        '101-1000',
        '1001-10000',
        '10001+'
    ]

    const espècesToKeywords = makeEspèceToKeywords(espècesProtégéesOiseau)
    const espècesToLabel = makeEspèceToLabel(espècesProtégéesOiseau)

    /** @param {EspèceProtégée} esp */
    const autocompleteKeywordsFunction = esp => espècesToKeywords.get(esp)

    /** @param {EspèceProtégée} esp */
    const autocompleteLabelFunction = esp => espècesToLabel.get(esp)
</script>

<tr>
    <td>
        <AutocompleteEspeces 
            bind:selectedItem={oiseauAtteint.espèce} 
            espèces={espècesProtégéesOiseau} 
            htmlClass="fr-input"
            labelFunction={autocompleteLabelFunction}
            keywordsFunction={autocompleteKeywordsFunction}
        />
    </td>
    <td>
        <select bind:value={oiseauAtteint.activité} class="fr-select">
            <option>-</option>
            {#each activitésMenaçantes || [] as act}
            <option value={act}>
                {act['étiquette affichée']}
            </option>
            {/each}
        </select>
    </td>

    <td>
        <select bind:value={oiseauAtteint.méthode} disabled={oiseauAtteint.activité && oiseauAtteint.activité['Méthode'] === 'n'} class="fr-select">
            <option>-</option>
            {#each méthodesMenaçantes as met}
                <option value={met}>{met['étiquette affichée']}</option>
            {/each}
        </select>
    </td>

    <td>
        <select bind:value={oiseauAtteint.transport} disabled={oiseauAtteint.activité && oiseauAtteint.activité['transport'] === 'n'} class="fr-select">
            <option>-</option>
            {#each transportMenaçants as trans}
                <option value={trans}>{trans['étiquette affichée']}</option>
            {/each}
        </select>
    </td>

    <td>
        <select bind:value={oiseauAtteint.nombreIndividus} class="fr-select">
            {#each fourchettesIndividus as fourchette}
                <option value={fourchette}>{fourchette}</option>
            {/each}
        </select>
    </td>

    <td>
        <input type="number" bind:value={oiseauAtteint.nombreNids} min="0" step="1" class="fr-input">
    </td>

    <td>
        <input type="number" bind:value={oiseauAtteint.nombreOeufs} min="0" step="1" class="fr-input">
    </td>

    <td>
        <input type="number" bind:value={oiseauAtteint.surfaceHabitatDétruit} min="0" step="1" class="fr-input">
    </td>
    <td>
        <button type="button" on:click={() => supprimerLigne(oiseauxAtteints, oiseauAtteint.espèce)}>❌</button>
    </td>
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
    }
</style>