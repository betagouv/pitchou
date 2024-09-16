<script>
    // @ts-check

    import { makeEspèceToKeywords, makeEspèceToLabel, etresVivantsAtteintsCompareEspèce, fourchettesIndividus} from "../../espèceFieldset.js";
    import AutocompleteEspeces from "../AutocompleteEspèces.svelte"
    import NomEspèce from "../NomEspèce.svelte"
    
    /** @import {FloreAtteinte, EspèceProtégée, ActivitéMenançante} from "../../../types/especes.d.ts" */

    /** @type {FloreAtteinte[]} */
    export let floresAtteintes

    /** @type {EspèceProtégée[]} */
    export let espècesProtégéesFlore

    /** @type {ActivitéMenançante[]} */
    export let activitésMenaçantes

    const espècesToKeywords = makeEspèceToKeywords(espècesProtégéesFlore)
    const espècesToLabel = makeEspèceToLabel(espècesProtégéesFlore)

    /** @param {EspèceProtégée} esp */
    const autocompleteKeywordsFunction = esp => espècesToKeywords.get(esp)

    /** @param {EspèceProtégée} esp */
    const autocompleteLabelFunction = esp => espècesToLabel.get(esp)
    
    function rerender() {
        floresAtteintes = floresAtteintes
    }

    /** @param {EspèceProtégée} flore */
    function ajouterFlore(flore) {
        floresAtteintes.push({
            espèce: flore,
        })

        rerender()
    }

    /** @param {EspèceProtégée} _espèce */
    function supprimerLigne(_espèce){
        const index = floresAtteintes.findIndex(({espèce}) => espèce === _espèce);
        if (index > -1) { 
            floresAtteintes.splice(index, 1);
        }

        rerender()
    }
</script>

<div class="fr-grid-row fr-mb-4w fr-grid-row--center">
    <div class="fr-col">
        <section class="saisie-flore">
            <h3>Végétaux</h3>
            <div class="fr-table fr-table--bordered">
                <table>
                    <thead>
                        <tr>
                            <th>Espèce</th>
                            <th>Type d’impact</th>
                            <th>Nombre d'individus</th>
                            <th>Surface habitat détruit (m²)</th>
                            <th>Supprimer la ligne</th>
                        </tr>
                    </thead>
                    
                    <tbody>
                        {#each floresAtteintes as {espèce, activité, nombreIndividus, surfaceHabitatDétruit}}
                            <tr>
                                <td>
                                    <AutocompleteEspeces 
                                        bind:selectedItem={espèce} 
                                        espèces={espècesProtégéesFlore} 
                                        htmlClass="fr-input"
                                        labelFunction={autocompleteLabelFunction}
                                        keywordsFunction={autocompleteKeywordsFunction}
                                    />
                                </td>
                                <td>
                                    <select bind:value={activité} class="fr-select">
                                        <option>-</option>
                                        {#each activitésMenaçantes || [] as act}
                                        <option value={act}>
                                            {act['étiquette affichée']}
                                        </option>
                                        {/each}
                                    </select>
                                </td>

                                <td>
                                    <select bind:value={nombreIndividus} class="fr-select">
                                        <option>-</option>
                                        {#each fourchettesIndividus as fourchette}
                                            <option value={fourchette}>{fourchette}</option>
                                        {/each}
                                    </select>
                                </td>

                                <td>
                                    <input type="number" bind:value={surfaceHabitatDétruit} min="0" step="1" class="fr-input">
                                </td>
                                <td>
                                    <button type="button" on:click={() => supprimerLigne(espèce)}>❌</button>
                                </td>
                            </tr>
                        {/each}

                        <tr>
                            <td>
                                <AutocompleteEspeces 
                                    espèces={espècesProtégéesFlore} 
                                    onChange={ajouterFlore} 
                                    htmlClass="fr-input search"
                                    labelFunction={autocompleteLabelFunction}
                                    keywordsFunction={autocompleteKeywordsFunction}
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
                        </tr>
                    </tbody>
                </table>
            </div>

            {#if floresAtteintes.length >= 1}
                <section class="arrete-prefectoral fr-p-1w">
                    <h4>Liste des espèces concernées par la demande de dérogation</h4>
                    {#each floresAtteintes.toSorted(etresVivantsAtteintsCompareEspèce) as  floreAtteinte, index (floreAtteinte) }
                        {#if index !== 0 },&nbsp;{/if}<NomEspèce espèce={floreAtteinte.espèce} />
                    {/each} 
                </section>
            {/if}
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

            tr {
                th{
                    padding: 0.2rem;

                    vertical-align: top;
                }

                button{
                    all: unset;
                    cursor: pointer;
                }
            }
        }

        .arrete-prefectoral{
            border-radius: 0.4em;
            width: 100%;

            background-color: rgba(255, 255, 255, 0.1);
        }
    }
</style>