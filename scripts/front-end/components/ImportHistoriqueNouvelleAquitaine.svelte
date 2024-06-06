<script>
    //@ts-check
    import {dsvFormat} from 'd3-dsv'

    import {toDossierTableauSuiviNouvelleAquitaine2023, dossierSuiviNAVersDossierDS88444, dossierSuiviNAVersAnnotationsDS88444} from '../../commun/typeFormat.js'

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
        {#await candidatsImportsMapP}
            (en chargement)
        {:then candidatsImportsMap} 
            {#if candidatsImportsMap}
                <ul>
                {#each [...candidatsImportsMap.values()] as {dossier, annotations}}
                    <li>
                        <details>
                            <summary>
                                {formatDateRelative(annotations['Date de réception DDEP'])} - 
                                {dossier['Porteur de projet']} - 
                                {dossier['Nom du projet']} - 
                                {dossier['Commune(s) où se situe le projet'].join(', ')} ({dossier['Département(s) où se situe le projet'].join(', ')})</summary>
                        </details>
                    </li>
                {/each}
                </ul>
            {/if}
        {/await}


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
        max-width: 60rem;
        margin: auto;

        h1{
            text-align: center;
        }

        label.file{
            padding: 1rem;
            border-radius: 0.5rem;

            border: 1px solid #ddd;
        }
    }
</style>
