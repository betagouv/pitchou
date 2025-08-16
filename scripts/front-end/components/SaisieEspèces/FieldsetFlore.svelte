<script>
    // @ts-check

    import {
        trierParOrdreAlphabétiqueEspèce,
        grouperParActivité,
     } from "../../triEspèces.js"
    import AutocompleteEspeces from "./AutocompleteEspèces.svelte"
    import FloreAtteinteEditRow from "./FloreAtteinteEditRow.svelte"
    import TrisDeTh from "../TrisDeTh.svelte"

    /** @import {FloreAtteinte, EspèceProtégée, ActivitéMenançante} from "../../../types/especes.d.ts" */
    /** @import { TriTableau } from '../../../types/interfaceUtilisateur.ts' */

    
    /**
     * @typedef {Object} Props
     * @property {FloreAtteinte[]} floresAtteintes
     * @property {EspèceProtégée[]} espècesProtégéesFlore
     * @property {ActivitéMenançante[]} activitésMenaçantes
     */

    /** @type {Props} */
    let { floresAtteintes = $bindable(), espècesProtégéesFlore, activitésMenaçantes } = $props();

    /** @type {TriTableau | undefined}*/
    let triSélectionné = $state(undefined)

    function rerender() {
        floresAtteintes = floresAtteintes
    }

    /** @type {EspèceProtégée | undefined} */
    let espèceRechercheSélectionnée = $state(undefined)

    $effect(() => {
        if(espèceRechercheSélectionnée){
            floresAtteintes.push({
                espèce: espèceRechercheSélectionnée
            })
            triSélectionné = undefined
            espèceRechercheSélectionnée = undefined
        }
        
    })

    /** @param {EspèceProtégée} _espèce */
    function onSupprimerLigne(_espèce){
        const index = floresAtteintes.findIndex(({espèce}) => espèce === _espèce);
        if (index > -1) {
            floresAtteintes.splice(index, 1);
        }

        rerender()
    }

    /**
     * @param {FloreAtteinte} floreAtteinte
    */
    function onDupliquerLigne(floreAtteinte) {
        floresAtteintes.push(floreAtteinte)
        triSélectionné = undefined

        rerender()
    }

    function trierParFloreDeAaZ() {
        floresAtteintes = trierParOrdreAlphabétiqueEspèce(floresAtteintes)
        rerender()
    }

    function trierParFloreDeZaA() {
        floresAtteintes = trierParOrdreAlphabétiqueEspèce(floresAtteintes).reverse()
        rerender()
    }

    /** @type {TriTableau[]} */
    const trisEspèces = [
        { nom: "Trier de A à Z", trier: trierParFloreDeAaZ, id: 'espèces-AZ' },
        { nom: "Trier de Z à A", trier: trierParFloreDeZaA, id: 'espèces-AZ' },
    ]

    function trierParImpacts() {
        floresAtteintes = grouperParActivité(floresAtteintes)
        rerender()
    }

    /** @type {TriTableau[]} */
    const trisImpacts = [
        { nom: "Grouper", trier: trierParImpacts, id: 'impacts' },
    ]
</script>

<div class="fr-grid-row fr-mb-4w fr-grid-row--center">
    <div class="fr-col">
        <section class="saisie-flore">
            <h3>Végétaux</h3>
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
                            <th>Nombre d'individus</th>
                            <th>Surface habitat détruit (m²)</th>
                            <th>Dupliquer la ligne</th>
                            <th>Supprimer la ligne</th>
                        </tr>
                    </thead>

                    <tbody>
                        {#each floresAtteintes as floreAtteinte}
                            <FloreAtteinteEditRow
                                bind:espèce={floreAtteinte.espèce} 
                                bind:activité={floreAtteinte.activité}
                                bind:nombreIndividus={floreAtteinte.nombreIndividus}
                                bind:surfaceHabitatDétruit={floreAtteinte.surfaceHabitatDétruit}
                                {espècesProtégéesFlore} {activitésMenaçantes}
                                {onSupprimerLigne}
                                {onDupliquerLigne}
                            />
                        {/each}

                        <tr>
                            <td>
                                <AutocompleteEspeces
                                    espèces={espècesProtégéesFlore}
                                    bind:espèceSélectionnée={espèceRechercheSélectionnée}
                                />
                            </td>
                            <td>
                                <select class="fr-select" disabled><option>- - - -</option></select>
                            </td>
                            <td>
                                <select disabled class="fr-select"><option>- - - -</option></select>
                            </td>
                            <td>
                                <input disabled type="number" class="fr-input">
                            </td>
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

    .saisie-flore {
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
