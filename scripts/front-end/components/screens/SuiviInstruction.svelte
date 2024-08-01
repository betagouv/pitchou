<script>
    //@ts-check
    import Squelette from '../Squelette.svelte'
    import {formatLocalisation, formatDemandeur, formatDéposant, formatDateRelative, formatDateAbsolue} from '../../affichageDossier.js'

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
                        </tr>
                    </thead>
                    <tbody>
                        {#each dossiers as { id, nom_dossier, déposant_nom, déposant_prénoms, communes, départements, régions, enjeu_politique, enjeu_écologique }}
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

    .fr-badge {
        white-space: nowrap;
    }
</style>