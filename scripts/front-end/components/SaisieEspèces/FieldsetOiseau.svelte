<script>
    // @ts-check

    import { makeEspèceToKeywords, makeEspèceToLabel } from "../../espèceFieldset.js"
    import {
        trierParOrdreAlphabétiqueEspèce,
        grouperParActivité,
        grouperParMéthode,
     } from "../../triEspèces.js"
    import AutocompleteEspeces from "../AutocompleteEspèces.svelte"
    import OiseauAtteintEditRow from "./OiseauAtteintEditRow.svelte"
    import TrisDeTh from "../TrisDeTh.svelte"

    /** @import {OiseauAtteint, EspèceProtégée, ActivitéMenançante, MéthodeMenançante, TransportMenançant} from "../../../types/especes.d.ts" */

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

    const espècesToKeywords = makeEspèceToKeywords(espècesProtégéesOiseau)
    const espècesToLabel = makeEspèceToLabel(espècesProtégéesOiseau)

    /** @param {EspèceProtégée} esp */
    const autocompleteKeywordsFunction = esp => espècesToKeywords.get(esp)

    /** @param {EspèceProtégée} esp */
    const autocompleteLabelFunction = esp => espècesToLabel.get(esp)

    /** @type {{nom: string, tri: function}|undefined}*/
    let triSélectionné = undefined

    function rerender() {
        oiseauxAtteints = oiseauxAtteints
    }

    /** @param {EspèceProtégée} oiseau */
    function ajouterOiseau(oiseau) {
        oiseauxAtteints.push({
            espèce: oiseau,
        })
        triSélectionné = undefined

        rerender()
    }

    /** @param {EspèceProtégée} _espèce */
    function onSupprimerLigne(_espèce){
        const index = oiseauxAtteints.findIndex(({espèce}) => espèce === _espèce);
        if (index > -1) {
            oiseauxAtteints.splice(index, 1);
        }

        rerender()
    }

    /**
     * @param {OiseauAtteint} oiseauAtteint
    */
    function onDupliquerLigne(oiseauAtteint) {
        oiseauxAtteints.push(oiseauAtteint)
        triSélectionné = undefined

        rerender()
    }

    function trierParOiseauxDeAaZ() {
        oiseauxAtteints = trierParOrdreAlphabétiqueEspèce(oiseauxAtteints)
        rerender()
    }

    function trierParOiseauxDeZaA() {
        oiseauxAtteints = trierParOrdreAlphabétiqueEspèce(oiseauxAtteints).reverse()
        rerender()
    }

    const trisEspèces = new Set([
        { nom: "Trier de A à Z", tri: trierParOiseauxDeAaZ },
        { nom: "Trier de Z à A", tri: trierParOiseauxDeZaA },
    ])

    function trierParImpacts() {
        oiseauxAtteints = grouperParActivité(oiseauxAtteints)
        rerender()
    }

    const trisImpacts = new Set([
        { nom: "Grouper", tri: trierParImpacts }
    ])

    function trierParMéthode() {
        oiseauxAtteints = grouperParMéthode(oiseauxAtteints)
        rerender()
    }

    const trisMéthodes = new Set([
        { nom: "Grouper", tri: trierParMéthode}
    ])
</script>

<div class="fr-grid-row fr-mb-4w fr-grid-row--center">
    <div class="fr-col">
        <section class="saisie-oiseau">
            <h3>Oiseaux</h3>
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
                            <th>Nids</th>
                            <th>Œufs</th>
                            <th>Surface habitat détruit (m²)</th>
                            <th>Dupliquer la ligne</th>
                            <th>Supprimer la ligne</th>
                        </tr>
                    </thead>
                    <tbody>

                        {#each oiseauxAtteints as {espèce, activité, méthode, transport, nombreIndividus, nombreNids, nombreOeufs, surfaceHabitatDétruit}}
                            <OiseauAtteintEditRow
                                bind:espèce bind:activité bind:méthode bind:transport bind:nombreIndividus bind:nombreNids bind:nombreOeufs bind:surfaceHabitatDétruit
                                {espècesProtégéesOiseau} {activitésMenaçantes} {méthodesMenaçantes} {transportMenaçants}
                                {onSupprimerLigne}
                                {onDupliquerLigne}
                            />
                        {/each}

                        <tr>
                            <td>
                                <AutocompleteEspeces
                                    espèces={espècesProtégéesOiseau}
                                    onChange={ajouterOiseau}
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
                            <td><input disabled type="number" class="fr-input"></td>
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

    .saisie-oiseau {
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
