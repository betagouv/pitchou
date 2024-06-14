<script>
    //@ts-check
    import {dsvFormat} from 'd3-dsv'

    import Squelette from './Squelette.svelte'

    import {toDossierTableauSuiviNouvelleAquitaine2023, dossierSuiviNAVersDossierDS88444, dossierSuiviNAVersAnnotationsDS88444} from '../../commun/typeFormat.js'
    import {créerLienPréremplissageDémarche} from '../../commun/préremplissageDémarcheSimplifiée.js'
    import {formatLocalisation, formatDemandeur, formatDéposant, formatDateRelative} from '../affichageDossier.js'

    import '../../types.js'

    const scsv = dsvFormat(';')

    /** @type {import('../../types/database/public/Dossier.js').default[]} */
    //export let dossiers

    /** @type { Map<GeoAPICommune['nom'], GeoAPICommune> } */
    export let nomToCommune

    /** @type { Map<DossierTableauSuiviNouvelleAquitaine2023['Type de projet'], DossierDémarcheSimplifiée88444['Objet du projet'] } */
    export let typeVersObjet

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
            (
                candidat['Porteur de projet'] || 
                candidat['Nom du projet'] || 
                (Array.isArray(candidat['Localisation']) && candidat['Localisation'].length >= 1)
            )
    }

    $: if(fichiersImportRaw){
        candidatsImportsSuiviNAP = fichiersImportRaw[0].text()
            .then(scsv.parse)
            .then(dossiers => dossiers.map(dossier => toDossierTableauSuiviNouvelleAquitaine2023(dossier, nomToCommune)))
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
                    dossier: dossierSuiviNAVersDossierDS88444(d, typeVersObjet),
                    annotations: dossierSuiviNAVersAnnotationsDS88444(d)
                }
            ]
        }))
    )

    $: if(candidatsImportsMapP) candidatsImportsMapP.then(console.log)

</script>

<Squelette>
    <article>

        <h1>Import dossiers historiques</h1>

        <section class="fr-grid-row fr-mb-6w">
            <div class="fr-col-8">
                <h2>Import csv</h2>
                <p>
                    Exportez le tableau de suivi Nouvelle Aquitaine au format .csv (utilisant le point-virgule 
                    comme "séparateur de champ").<br>
                    Et déposez le fichier .csv ici : 
                </p>
                <label class="file">
                    <strong>Fichier d'import :</strong>
                    <input bind:files={fichiersImportRaw} type="file" class="fr-input">
                </label>
            </div>
        </section>

        <section class="fr-grid-row fr-mb-6w">
            <div class="fr-col">
            {#await candidatsImportsMapP}
                (en chargement)
            {:then candidatsImportsMap} 
                {#if candidatsImportsMap}
                    <h2>Dossiers à créer sur Démarches Simplifiées ({candidatsImportsMap.size}) </h2>
                    <div class="fr-table">
                        <table>
                            <thead>
                                <tr>
                                    <th><abbr title="Département">Dpt</abbr></th>
                                    <th>Nom du porteur de projet</th>
                                    <th>Nom du projet</th>
                                    <th>Commune(s)</th>
                                    <th><abbr title="Autorisation environnementale">AE</abbr></th>
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
                                    <td>
                                        {#each dossier['Commune(s) où se situe le projet'] as commune, i}
                                            {#if i !== 0},{/if}
                                            {#if typeof commune === 'string'}
                                                <span class="non-reconnu" title="Nom de commune non reconnu">⚠️ {commune}</span>
                                            {:else}
                                                {commune.nom} ({commune.codeDepartement})
                                            {/if}
                                        {/each}
                                    </td>
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
                    </div>
                {/if}
            {/await}
            </div>
        </section>

        <section class="fr-grid-row fr-mb-6w">
            <div class="fr-col">
                <h2>Dossiers déja créés</h2>
                <strong>
                    PPP: Tableau replié
                        Les dossiers sont reconnus d'abord par nom de projet
                        puis par nom de porteur (si unique)
                        puis par nom de représentant (si unique)
                </strong>
            </div>
        </section>

        <section class="fr-grid-row fr-mb-6w">
            <div class="fr-col">
                <h2>Annotations à rajouter à un dossier</h2>
                <strong>
                    PPP: Pour toutes les données dans le tableau, proposer d'affecter les données à un dossier dans DS
                        Essayer de retrouver le dossier avec le même algo (nom de projet, porteur, représentant)
                </strong>
            </div>
        </section>
    </article>
</Squelette>

<style lang="scss">
    article{
        tr{
            border: 1px solid #CCC;
            border-width: 1px 0;
        }

        td, th{
            vertical-align: top;

            .non-reconnu{
                text-decoration: underline dotted;
            }
        }
    }
</style>
