<script>
    //@ts-check
    import {dsvFormat} from 'd3-dsv'

    import {toDossierTableauSuiviNouvelleAquitaine2023, dossierSuiviNAVersDossierDS88444, dossierSuiviNAVersAnnotationsDS88444} from '../../commun/typeFormat.js'

    import {créerLienPréremplissageDémarche} from '../../commun/préremplissageDémarcheSimplifiée.js'

    import {formatLocalisation, formatDemandeur, formatDéposant, formatDateRelative} from '../affichageDossier.js'

    import '../../types.js'

    const scsv = dsvFormat(';')

    /** @type {import('../../types/database/public/Dossier.js').default[]} */
    export let dossiers

    let fichiersImportRaw;
    
    /** @type {Promise<DossierTableauSuiviNouvelleAquitaine2023[]>} */
    let candidatsImportsSuiviNAP
    /** @type {Promise< Map<DossierTableauSuiviNouvelleAquitaine2023, {dossier: DossierDémarcheSimplifiée88444, annotations: AnnotationsPrivéesDémarcheSimplifiée88444} > >} */
    let candidatsImportsMapP

    /**
     * 
     * @param {DossierTableauSuiviNouvelleAquitaine2023} candidat
     */
    function estImportable(candidat){
        return !candidat['Décision'] &&
            (candidat['Porteur de projet'] || candidat['Nom du projet'] || candidat['Localisation'])
    }

    $: if(fichiersImportRaw){
        candidatsImportsSuiviNAP = fichiersImportRaw[0].text()
            .then(scsv.parse)
            .then(dossiers => dossiers.map(toDossierTableauSuiviNouvelleAquitaine2023))
            .then((/** @type {DossierTableauSuiviNouvelleAquitaine2023[]} */ candidats) => 
                candidats.filter(estImportable)
            )
    }
    $: if(candidatsImportsSuiviNAP) candidatsImportsSuiviNAP.then(console.log)
    $: if(candidatsImportsSuiviNAP) candidatsImportsMapP = candidatsImportsSuiviNAP.then(dossiers => 
        new Map( dossiers.map(d => {
            return [
                d, 
                {
                    dossier: dossierSuiviNAVersDossierDS88444(d),
                    annotations: dossierSuiviNAVersAnnotationsDS88444(d)
                }
            ]
        }))
    )

    $: if(candidatsImportsMapP) candidatsImportsMapP.then(console.log)

    

</script>

<article>
    <h1>Import dossiers historiques</h1>

    <section>
        <h2>Import csv</h2>
        <p>
            Remplissez <a href="/data/import-historique/exemple-import.ods">ce fichier tableur d'exemple</a>, 
            avec les informations à saisir pour l'import en masse
            puis, exportez-le au format .csv (utilisant le point-virgule comme "séparateur de champ").
            Et déposez le fichier .csv ici : 
        </p>
        <label class="file">
            <strong>Fichier d'import :</strong>
            <input bind:files={fichiersImportRaw} type="file">
        </label>
        <section>
            {#await candidatsImportsMapP}
                (en chargement)
            {:then candidatsImportsMap} 
                {#if candidatsImportsMap}
                    <h2>Dossiers à créer sur Démarches Simplifiées ({candidatsImportsMap.size}) </h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Département</th>
                                <th>Nom du porteur de projet</th>
                                <th>Nom du projet</th>
                                <th>Commune</th>
                                <th>Autorisation environnementale</th>
                                <th>Préremplissage</th>
                                <th>Email au porteur de projet</th>
                            </tr>
                        </thead>
                        <tbody>
                        {#each [...candidatsImportsMap.values()] as {dossier, annotations}}
                            <tr>
                                <td>{dossier['Département(s) où se situe le projet'].join(', ')}</td>
                                <td>{dossier['Porteur de projet']}</td>
                                <td>{dossier['Nom du projet']}</td>
                                <td>{dossier['Commune(s) où se situe le projet'].join(', ')}</td>
                                <td>{dossier['Le projet est-il soumis à une autorisation environnementale ?'] ? 'oui' : 'non'}</td>
                                <td><a target="_blank" href={créerLienPréremplissageDémarche(dossier)}>Créer le dossier pré-rempli</a></td>
                                <td>
                                    {#if dossier['Nom du représentant'] && dossier['Adresse mail de contact']}
                                        <a href={`mailto:${dossier['Adresse mail de contact']}`}>
                                            Envoyer un email à {dossier['Nom du représentant']} {dossier['Prénom du représentant'] || ''}
                                        </a>
                                    {:else}
                                        (adresse email ou nom/prénom manquant)
                                    {/if}
                                </td>
                                
                                
                            </tr>
                        {/each}
                        </tbody>
                    </table>

                    <h2>Dossiers déja créés</h2>
                    <strong>
                        PPP: Tableau replié
                            Les dossiers sont reconnus d'abord par nom de projet
                            puis par nom de porteur (si unique)
                            puis par nom de représentant (si unique)
                    </strong>

                {/if}

                <h2>Annotations à rajouter à un dossier</h2>
                <strong>
                    PPP: Pour toutes les données dans le tableau, proposer d'affecter les données à un dossier dans DS
                        Essayer de retrouver le dossier avec le même algo (nom de projet, porteur, représentant)
                </strong>

            {/await}

            

        </section>

    </section>

    <section>
        <h2>Chronologie</h2>
    </section>

    <section>
        <h2>Interlocueurs</h2>
    </section>

</article>

<style lang="scss">
    article{
        text-align: left;
        max-width: 80rem;
        margin: auto;

        h1{
            text-align: center;
        }

        label.file{
            padding: 1rem;
            border-radius: 0.5rem;

            border: 1px solid #ddd;
        }

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
    }
</style>
