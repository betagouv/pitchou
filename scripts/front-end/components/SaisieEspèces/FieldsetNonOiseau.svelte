<script>
    // @ts-check

    import { makeEspèceToKeywords, makeEspèceToLabel} from "../../espèceFieldset.js"
    import {
        trierParOrdreAlphabétiqueEspèce,
        grouperParActivité,
        grouperParMéthode,
     } from "../../triEspèces.js"
    import AutocompleteEspeces from "../AutocompleteEspèces.svelte"
    import FauneNonOiseauAtteinteEditRow from "./FauneNonOiseauAtteinteEditRow.svelte"
    import TrisDeTh from "../TrisDeTh.svelte"

    /** @import {FauneNonOiseauAtteinte, EspèceProtégée, ActivitéMenançante, MéthodeMenançante, TransportMenançant} from "../../../types/especes.d.ts" */
    /** @import { TriTableau } from '../../../types/interfaceUtilisateur.ts' */

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

    /** @type {TriTableau | undefined} */
    let triSélectionné = undefined

    function rerender() {
        faunesNonOiseauxAtteintes = faunesNonOiseauxAtteintes
    }

    /** @param {EspèceProtégée} fauneNonOiseau */
    function ajouterFauneNonOiseau(fauneNonOiseau) {
        faunesNonOiseauxAtteintes.push({
            espèce: fauneNonOiseau,
        })
        triSélectionné = undefined

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
        triSélectionné = undefined

        rerender()
    }

    function trierParFauneNonOiseauxDeAaZ() {
        faunesNonOiseauxAtteintes= trierParOrdreAlphabétiqueEspèce(faunesNonOiseauxAtteintes)
        rerender()
    }

    function trierParFauneNonOiseauxDeZaA() {
        faunesNonOiseauxAtteintes = trierParOrdreAlphabétiqueEspèce(faunesNonOiseauxAtteintes).reverse()
        rerender()
    }

    /** @type {TriTableau[]} */
    const trisEspèces = [
        { nom: "Trier de A à Z", trier: trierParFauneNonOiseauxDeAaZ, id: 'espèces-AZ' },
        { nom: "Trier de Z à A", trier: trierParFauneNonOiseauxDeZaA, id: 'espèces-AZ' },
    ]

    function trierParImpacts() {
        faunesNonOiseauxAtteintes = grouperParActivité(faunesNonOiseauxAtteintes)
        rerender()
    }

    /** @type {TriTableau[]} */
    const trisImpacts = [
        { nom: "Grouper", trier: trierParImpacts, id: 'impacts' },
    ]

    function trierParMéthode() {
        faunesNonOiseauxAtteintes = grouperParMéthode(faunesNonOiseauxAtteintes)
        rerender()
    }

    /** @type {TriTableau[]} */
    const trisMéthodes = [
        { nom: "Grouper", trier: trierParMéthode, id: 'méthodes' },
    ]
</script>

<div class="fr-grid-row fr-mb-4w fr-grid-row--center">
    <div class="fr-col">
        <section class="saisie-faune">
            <h3>Faune (hors oiseaux)</h3>
            <div class="fr-table fr-table--bordered">
                <table>
                    <thead>
                        <tr>
                            <th>
                                Espèce
                                <TrisDeTh
                                    tris={trisEspèces}
                                    bind:triSélectionné
                                />
                            </th>
                            <th>
                                Type d'impact
                                <TrisDeTh
                                    tris={trisImpacts}
                                    bind:triSélectionné
                                />
                            </th>
                            <th>
                                Méthode
                                <TrisDeTh
                                    tris={trisMéthodes}
                                    bind:triSélectionné
                                />
                            </th>
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

            tr th {
                vertical-align: top;
            }
        }
    }
</style>
