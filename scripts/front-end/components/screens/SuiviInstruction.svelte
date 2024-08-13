<script>
    //@ts-check
    import Squelette from '../Squelette.svelte'
    import {formatLocalisation, formatDéposant} from '../../affichageDossier.js'

    /** @import {DossierComplet} from '../../../types.js' */

    /** @type {DossierComplet[]} */
    export let dossiers = []

    console.log('dossiers', dossiers)

    export let email

</script>

<Squelette {email}>
    <div class="fr-grid-row fr-pt-6w fr-grid-row--center">
        <div class="fr-col">

            <h1>Suivi instruction <abbr title="Demandes de Dérogation Espèces Protégées">DDEP</abbr></h1>
            <div class="fr-table fr-table--bordered">
                <table>
                    <thead>
                        <tr>
                            <th>Voir le dossier</th>
                            <th>Localisation</th>
                            <th>Porteur de projet</th>
                            <th>Nom du projet</th>
                            <th>Enjeux</th>
                            <th>Rattaché au régime AE</th>
                            <th>Phase</th>
                            <th>Prochaine action attendue</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each dossiers as { id, nom_dossier, déposant_nom,
                          déposant_prénoms, communes, départements, régions,
                          enjeu_politique, enjeu_écologique,
                          rattaché_au_régime_ae, phase, prochaine_action_attendue, prochaine_action_attendue_par }}
                            <tr>
                                <td><a href={`/dossier/${id}`}>Voir le dossier</a></td>
                                <td>{formatLocalisation({communes, départements, régions})}</td>
                                <td>{formatDéposant({déposant_nom, déposant_prénoms})}</td>
                                <td>{nom_dossier || ''}</td>
                                <td>
                                    {#if enjeu_politique}
                                        <p class="fr-badge fr-badge--sm fr-badge--blue-ecume">
                                            Enjeu politique
                                        </p>
                                    {/if}

                                    {#if enjeu_écologique}
                                    <p class="fr-badge fr-badge--sm fr-badge--green-emeraude">
                                        Enjeu écologique
                                    </p>
                                    {/if}

                                </td>
                                <td>
                                    {rattaché_au_régime_ae ? "oui" : "non"}
                                </td>
                                <td>{phase || "non renseigné"}</td>
                                <td>
                                    {#if prochaine_action_attendue_par}
                                        <strong>{prochaine_action_attendue_par}</strong> :
                                    {/if}
                                    {#if prochaine_action_attendue}
                                        <br />{prochaine_action_attendue}
                                    {/if}
                                </td>
                            </tr>
                        {/each}
                    </tbody>

                </table>
            </div>
        </div>
    </div>

</Squelette>

<style lang="scss">
    td, th{
        vertical-align: top;
    }

    th {
        min-width: 6rem;
    }

    .fr-badge {
        white-space: nowrap;
    }
</style>
