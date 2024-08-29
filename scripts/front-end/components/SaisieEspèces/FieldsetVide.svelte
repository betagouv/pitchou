<script>
    // @ts-check

    import { makeEspèceToKeywords, makeEspèceToLabel } from "../../precalculsAutocompleteEspèces.js";
    import AutocompleteEspeces from "../AutocompleteEspèces.svelte"
    
    /** @import {EspèceProtégée, ClassificationEtreVivant} from "../../../types.js" */

    /** @type {ClassificationEtreVivant} */
    export let classification

    /** @type {EspèceProtégée[]} */
    export let espècesProtégéesDeLaClassification

    /** @param {EspèceProtégée} esp 
     */ 
    export let autocompleteOnChange

    const espècesToKeywords = makeEspèceToKeywords(espècesProtégéesDeLaClassification)
    const espècesToLabel = makeEspèceToLabel(espècesProtégéesDeLaClassification)

    /** @param {EspèceProtégée} esp */
    const autocompleteKeywordsFunction = esp => espècesToKeywords.get(esp)

    /** @param {EspèceProtégée} esp */
    const autocompleteLabelFunction = esp => espècesToLabel.get(esp)
</script>

<tr>
    <td>
        <AutocompleteEspeces 
            espèces={espècesProtégéesDeLaClassification} 
            onChange={autocompleteOnChange} 
            htmlClass="fr-input search"
            labelFunction={autocompleteLabelFunction}
            keywordsFunction={autocompleteKeywordsFunction}
        />
    </td>
    <td> <select class="fr-select" disabled><option>- - - -</option></select> </td>

    {#if classification !== "flore"}
        <td> <select class="fr-select" disabled><option>- - - -</option></select> </td>
        <td> <select class="fr-select" disabled><option>- - - -</option></select> </td>
    {/if}

    <td> <select disabled class="fr-select"><option>- - - -</option></select> </td>
    <td><input disabled type="number" class="fr-input"></td>

    {#if classification === "oiseau"}
        <td><input disabled type="number" class="fr-input"></td>
        <td><input disabled type="number" class="fr-input"></td>
    {/if}

    <td></td>
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
        
        input[type="number"] {
            border-radius: 0.5em;
            padding: 0.4em;
            width: 5em;
        }
    }
</style>