<script>
    import Squelette from './Squelette.svelte'
    //@ts-check
    import {formatLocalisation, formatDemandeur, formatDéposant, formatDateRelative, formatDateAbsolue} from '../affichageDossier.js'

    /** @type {import('../../types/database/public/Dossier.js').default[]} */
    export let dossiers = []

    console.log('dossiers', dossiers)

</script>

<Squelette>
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
                            <th>Localisation</th>
                            <th>Espèces protégées concernées, impacts, méthodes</th>
                            <th>Enjeu écologique</th>
                            <th>Dossier sur Démarche Simplifiée <strong>(pour de faux)</strong></th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each dossiers as { id, statut, date_dépôt, déposant_nom, déposant_prénoms, demandeur_personne_physique_nom, demandeur_personne_physique_prénoms, demandeur_personne_morale_raison_sociale, demandeur_personne_morale_siret, espèces_protégées_concernées, enjeu_écologiques, communes, départements, régions }}
                            <tr>
                                <td><a href={`/dossier/${id}`}>Voir le dossier</a></td>
                                <td>{statut}</td>
                                <td title={formatDateAbsolue(date_dépôt)}>{formatDateRelative(date_dépôt)}</td>
                                <td>{formatDéposant({déposant_nom, déposant_prénoms})}</td>
                                <td>{formatDemandeur({demandeur_personne_physique_nom, demandeur_personne_physique_prénoms, demandeur_personne_morale_raison_sociale, demandeur_personne_morale_siret})}</td>
                                <td>{formatLocalisation({communes, départements, régions})}</td>
                                <td>{#if espèces_protégées_concernées}
                                    <a href={espèces_protégées_concernées}>Espèces protégées concernées, impacts, méthodes</a>
                                {/if}</td>
                                <td>{enjeu_écologiques}</td>
                                <td><a target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/17842913`}>Allé !</a></td>
                            </tr>
                        {/each}
                    </tbody>

                </table>
            </div>
        </div>
    </div>

</Squelette>

<style>
    table{
        text-align: left;
    }

    tr{
        border: 1px solid #CCC;
        border-width: 1px 0;
    }

    td, th{
        vertical-align: top;
        padding: 0.3rem 0.6rem;
    }


</style>