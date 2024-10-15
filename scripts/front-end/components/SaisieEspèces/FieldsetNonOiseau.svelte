<script>
    // @ts-check

    import { makeEspèceToKeywords, makeEspèceToLabel} from "../../espèceFieldset.js";
    import AutocompleteEspeces from "../AutocompleteEspèces.svelte"
    import FauneNonOiseauAtteinteEditRow from "./FauneNonOiseauAtteinteEditRow.svelte"
    
    /** @import {FauneNonOiseauAtteinte, EspèceProtégée, ActivitéMenançante, MéthodeMenançante, TransportMenançant} from "../../../types/especes.d.ts" */

    /** @type {FauneNonOiseauAtteinte[]} */
    export let faunesNonOiseauxAtteintes

    /** @type {EspèceProtégée[]} */
    export let espècesProtégéesFauneNonOiseau

    /** @type {ActivitéMenançante[]} */
    export let activitésMenaçantes

    /** @type {MéthodeMenançante[]} */
    export let méthodesMenaçantes

    /** @type {TransportMenançant[]} */
    export let transportMenaçants
    
    const espècesToKeywords = makeEspèceToKeywords(espècesProtégéesFauneNonOiseau)
    const espècesToLabel = makeEspèceToLabel(espècesProtégéesFauneNonOiseau)

    /** @param {EspèceProtégée} esp */
    const autocompleteKeywordsFunction = esp => espècesToKeywords.get(esp)

    /** @param {EspèceProtégée} esp */
    const autocompleteLabelFunction = esp => espècesToLabel.get(esp)
    
    function rerender() {
        faunesNonOiseauxAtteintes = faunesNonOiseauxAtteintes
    }

    /** @param {EspèceProtégée} fauneNonOiseau */
    function ajouterFauneNonOiseau(fauneNonOiseau) {
        faunesNonOiseauxAtteintes.push({
            espèce: fauneNonOiseau,
        })

        rerender()
    }

    /** @param {EspèceProtégée} _espèce */
    function onSupprimerLigne(_espèce){
        const index = faunesNonOiseauxAtteintes.findIndex(({espèce}) => espèce === _espèce);
        if (index > -1) { 
            faunesNonOiseauxAtteintes.splice(index, 1);
        }

        rerender()
    }

    /**
     * @param {FauneNonOiseauAtteinte} fauneNonOiseauAtteinte
    */
    function onDupliquerLigne(fauneNonOiseauAtteinte) {
        faunesNonOiseauxAtteintes.push(fauneNonOiseauAtteinte)

        rerender()
    }
</script>

<div class="fr-grid-row fr-mb-4w fr-grid-row--center">
    <div class="fr-col">
        <section class="saisie-faune">
            <h3>Faune (hors oiseaux)</h3>
            <div class="fr-table fr-table--bordered">
                <table>
                    <thead>
                        <tr>
                            <th>Espèce</th>
                            <th>Type d’impact</th>
                            <th>Méthode</th>
                            <th>Moyen de poursuite</th>
                            <th>Nombre d'individus</th>
                            <th>Surface habitat détruit (m²)</th>
                            <th>Dupliquer la ligne</th>
                            <th>Supprimer la ligne</th>
                        </tr>
                    </thead>
                    
                    <tbody>
                        {#each faunesNonOiseauxAtteintes as {espèce, activité, méthode, transport, nombreIndividus, surfaceHabitatDétruit}}
                        <FauneNonOiseauAtteinteEditRow
                            bind:espèce bind:activité bind:méthode bind:transport bind:nombreIndividus bind:surfaceHabitatDétruit
                            {espècesProtégéesFauneNonOiseau} {activitésMenaçantes} {méthodesMenaçantes} {transportMenaçants}
                            {onSupprimerLigne}
                            {onDupliquerLigne}
                        />
                        {/each}

                        <tr>
                            <td>
                                <AutocompleteEspeces 
                                    espèces={espècesProtégéesFauneNonOiseau} 
                                    onChange={ajouterFauneNonOiseau} 
                                    htmlClass="fr-input search"
                                    labelFunction={autocompleteLabelFunction}
                                    keywordsFunction={autocompleteKeywordsFunction}
                                />
                            </td>
                            <td>
                                <select class="fr-select" disabled><option>- - - -</option></select> 
                            </td>
                            <td>
                                <select class="fr-select" disabled><option>- - - -</option></select> 
                            </td>
                            <td>
                                <select class="fr-select" disabled><option>- - - -</option></select> 
                            </td>
                            <td>
                                <select disabled class="fr-select"><option>- - - -</option></select> 
                            </td>
                            <td><input disabled type="number" class="fr-input"></td>
                            <td></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    </div>
</div>

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

    .saisie-faune {
        display: flex;
        flex-direction: column;
        align-items: flex-start;

        select{
            max-width: 10rem;
        }

        label{
            select{
                max-width: 30em;
            }
        }

        table{
            // surcharge DSFR pour que l'autocomplete s'affiche correctement
            overflow: initial;

            tr {
                th{
                    padding: 0.2rem;

                    vertical-align: top;
                }
            }
        }
    }
</style>
