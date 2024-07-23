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
                            <th>Statut</th>
                            <th>Date de dépôt</th>
                            <th>Déposant</th>
                            <th>Demandeur de la dérogation</th>
                            <th>Nom du projet</th>
                            <th>Localisation</th>
                            <th>Espèces protégées concernées, impacts, méthodes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each dossiers as { id, statut, nom_dossier, date_dépôt, déposant_nom, déposant_prénoms, demandeur_personne_physique_nom, demandeur_personne_physique_prénoms, demandeur_personne_morale_raison_sociale, demandeur_personne_morale_siret, espèces_protégées_concernées, communes, départements, régions }}
                            <tr>
                                <td><a href={`/dossier/${id}`}>Voir le dossier</a></td>
                                <td>{statut}</td>
                                <td title={formatDateAbsolue(date_dépôt)}>{formatDateRelative(date_dépôt)}</td>
                                <td>{formatDéposant({déposant_nom, déposant_prénoms})}</td>
                                <td>{formatDemandeur({demandeur_personne_physique_nom, demandeur_personne_physique_prénoms, demandeur_personne_morale_raison_sociale, demandeur_personne_morale_siret})}</td>
                                <td>{nom_dossier || ''}</td>
                                <td>{formatLocalisation({communes, départements, régions})}</td>
                                <td>{#if espèces_protégées_concernées}
                                    <a href={espèces_protégées_concernées}>Espèces protégées concernées, impacts, méthodes</a>
                                {/if}</td>
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
</style>