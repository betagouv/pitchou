<script>
    // @ts-check

    import { makeEspèceToKeywords, makeEspèceToLabel } from "../../precalculsAutocompleteEspèces.js";
    import AutocompleteEspeces from "../AutocompleteEspèces.svelte"
    
    /** @import {EtreVivantAtteint, EspèceProtégée, ActivitéMenançante} from "../../../types.js" */

    /** @type {EtreVivantAtteint} */
    export let etreVivantAtteint

    /** @type {EtreVivantAtteint[]} */
    export let etresVivantsAtteints

    /** @type {EspèceProtégée[]} */
    export let espècesProtégéesNonOiseau

    /** @type {ActivitéMenançante[]} */
    export let activitésMenaçantes
    
    /** @param {EtreVivantAtteint[]} etresVivantsAtteints
      * @param {EspèceProtégée} _espèce 
      */
    export let supprimerLigne

    /**
     * Les fourchettes sont des chaînes de caractères toujours au format 'x-y' où x et y sont des integer
     */
    
    /** @type {string[]}*/
    export let fourchettesIndividus = [
        '0-10',
        '11-100',
        '101-1000',
        '1001-10000',
        '10001+'
    ]

    const espècesToKeywords = makeEspèceToKeywords(espècesProtégéesNonOiseau)
    const espècesToLabel = makeEspèceToLabel(espècesProtégéesNonOiseau)

    /** @param {EspèceProtégée} esp */
    const autocompleteKeywordsFunction = esp => espècesToKeywords.get(esp)

    /** @param {EspèceProtégée} esp */
    const autocompleteLabelFunction = esp => espècesToLabel.get(esp)
</script>

<tr>
    <td>
        <AutocompleteEspeces 
            bind:selectedItem={etreVivantAtteint.espèce} 
            espèces={espècesProtégéesNonOiseau} 
            htmlClass="fr-input"
            labelFunction={autocompleteLabelFunction}
            keywordsFunction={autocompleteKeywordsFunction}
        />
    </td>
    <td>
        <select bind:value={etreVivantAtteint.activité} class="fr-select">
            <option>-</option>
            {#each activitésMenaçantes || [] as act}
            <option value={act}>
                {act['étiquette affichée']}
            </option>
            {/each}
        </select>
    </td>

    <td>
        <select bind:value={etreVivantAtteint.nombreIndividus} class="fr-select">
            {#each fourchettesIndividus as fourchette}
                <option value={fourchette}>{fourchette}</option>
            {/each}
        </select>
    </td>

    <td>
        <input type="number" bind:value={etreVivantAtteint.surfaceHabitatDétruit} min="0" step="1" class="fr-input">
    </td>
    <td>
        <button type="button" on:click={() => supprimerLigne(etresVivantsAtteints, etreVivantAtteint.espèce)}>❌</button>
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