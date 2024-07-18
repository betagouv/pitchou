<script>
    //@ts-check
    import {getODSTableRawContent, sheetRawContentToObjects} from 'ods-xlsx'

    import Squelette from '../Squelette.svelte'

    import {toDossierTableauSuiviNouvelleAquitaine2023, dossierSuiviNAVersDossierDS88444, dossierSuiviNAVersAnnotationsDS88444} from '../../../commun/typeFormat.js'
    import {créerLienPréremplissageDémarche} from '../../../commun/préremplissageDémarcheSimplifiée.js'
    // import {formatLocalisation, formatDemandeur, formatDéposant, formatDateRelative} from '../affichageDossier.js'

    /** @import {AnnotationsPrivéesDémarcheSimplifiée88444, DossierDémarcheSimplifiée88444, DossierTableauSuiviNouvelleAquitaine2023, GeoAPICommune, GeoAPIDépartement} from "../../../types.js" */
    /** @import {default as Dossier} from "../../../types/database/public/Dossier.ts" */
    /** @import {DossierComplet} from '../../../server/database.js' */

    
    export let email

    /** @type {DossierComplet[]} */
    export let dossiers
    $: dossiersStoackésEnBaseDeDonnées = dossiers

    $: console.log('dossiersStoackésEnBaseDeDonnées', dossiersStoackésEnBaseDeDonnées)

    /** @type { Map<GeoAPICommune['nom'], GeoAPICommune> } */
    export let nomToCommune

    /** @type { Map<GeoAPICommune['nom'], GeoAPIDépartement> } */
    export let stringToDépartement

    /** @type { Map<DossierTableauSuiviNouvelleAquitaine2023['Type de projet'], DossierDémarcheSimplifiée88444['Objet du projet']> } */
    export let typeVersObjet

    /** @type {FileList | undefined} */
    let fichiersImportRaw;
    
    /** @type {Promise<DossierTableauSuiviNouvelleAquitaine2023[]>} */
    let candidatsImportsSuiviNAP
    /** @type {Map<DossierTableauSuiviNouvelleAquitaine2023, {dossier: DossierDémarcheSimplifiée88444, annotations: AnnotationsPrivéesDémarcheSimplifiée88444} >} */
    let candidatsImportsMap

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
        candidatsImportsSuiviNAP = fichiersImportRaw[0].arrayBuffer()
            .then(buffer => getODSTableRawContent(buffer))
            .then(tableRaw => tableRaw.get("Dossiers en cours"))
            .then(dossiers => {
                /** @type {DossierTableauSuiviNouvelleAquitaine2023[]} */
                const dossiersObject = sheetRawContentToObjects(dossiers)

                return dossiersObject.map(dossier => toDossierTableauSuiviNouvelleAquitaine2023(dossier, nomToCommune, stringToDépartement))
            })
            .then((/** @type {DossierTableauSuiviNouvelleAquitaine2023[]} */ candidats) => 
                candidats.filter(estImportable)
            )
        
    }
    
    $: if(candidatsImportsSuiviNAP) candidatsImportsSuiviNAP.then(dossiers => 
        candidatsImportsMap = new Map( dossiers.map(d => {
            return [
                d, 
                {
                    dossier: dossierSuiviNAVersDossierDS88444(d, typeVersObjet, stringToDépartement),
                    annotations: dossierSuiviNAVersAnnotationsDS88444(d)
                }
            ]
        }))
    )

    $: console.log('candidatsImportsMap', candidatsImportsMap)


    /**
     * 
     * @param {Dossier} dossier
     * @returns {boolean}
     */
    function dossierHasAnnotations(dossier){
        return false && dossier;
    }
    
    // Dossiers reconnus

    /** @type {Map<DossierTableauSuiviNouvelleAquitaine2023, {dossier: DossierDémarcheSimplifiée88444, annotations: AnnotationsPrivéesDémarcheSimplifiée88444} >} */
    let candidatsDossierÀCréer
    /** @type {Map<DossierTableauSuiviNouvelleAquitaine2023, {dossier: DossierDémarcheSimplifiée88444, annotations: AnnotationsPrivéesDémarcheSimplifiée88444} >} */
    let candidatsAnnotationsÀAjouter
    /** @type {Map<DossierTableauSuiviNouvelleAquitaine2023, {dossier: DossierDémarcheSimplifiée88444, annotations: AnnotationsPrivéesDémarcheSimplifiée88444} >} */
    let candidatsDossiersComplet

    $: if(candidatsImportsMap && dossiersStoackésEnBaseDeDonnées) {
        candidatsDossierÀCréer = new Map()
        candidatsAnnotationsÀAjouter = new Map()
        candidatsDossiersComplet = new Map()

        for(const [dossierTableauSuivi, {dossier: dossierPartiel88444, annotations: annotationsPartielle88444}] of candidatsImportsMap){
            const nomProjetDossierCandidat = dossierPartiel88444['Nom du projet']
            const dossierEnBaseDeDonnéeCorrespondant = dossiersStoackésEnBaseDeDonnées.find(d => d.nom_dossier === nomProjetDossierCandidat)

            if(!dossierEnBaseDeDonnéeCorrespondant){
                candidatsDossierÀCréer.set(dossierTableauSuivi, {dossier: dossierPartiel88444, annotations: annotationsPartielle88444})
            }
            else{
                if(!dossierHasAnnotations(dossierEnBaseDeDonnéeCorrespondant)){
                    candidatsAnnotationsÀAjouter.set(dossierTableauSuivi, {dossier: dossierPartiel88444, annotations: annotationsPartielle88444})
                }
                else{
                    candidatsDossiersComplet.set(dossierTableauSuivi, {dossier: dossierPartiel88444, annotations: annotationsPartielle88444})
                }
            }
        }
    }

</script>

<Squelette {email}>
    <article>

        <h1>Import dossiers historiques</h1>

        <section class="fr-grid-row fr-mb-6w">
            <div class="fr-col">
                <h2>Importer le Tableau de suivi DREP 2023 au format .ods</h2>
                <p>
                    Télécharger le tableau de suivi Nouvelle-Aquitaine au <strong>format .ods</strong>.<br>
                    Sur Google Spreadsheet, suivre <code>Fichier</code> ➡️ <code>Télécharger</code> ➡️ <code>OpenDocument (.ods)</code>
                </p>
                <label class="file">
                    <strong>Importer le fichier .ods&nbsp;:</strong>
                    <input bind:files={fichiersImportRaw} type="file" accept=".ods" class="fr-input">
                </label>
            </div>
        </section>


        {#await candidatsImportsSuiviNAP}
        <section class="fr-grid-row fr-mb-6w">
            <div class="fr-col">
                (en chargement)
            </div>
        </section>
        {:then} 
            {#if candidatsDossierÀCréer}
            <section class="fr-grid-row fr-mb-6w">
                <div class="fr-col">
                    <h2>Dossiers à créer sur Démarches Simplifiées ({candidatsDossierÀCréer.size}) </h2>
                    <details>
                        <summary>Aide commune/département non-reconnu</summary>
                        <p>
                            Si la commune n'est pas reconnue, il peut s'agir d'un problème d'apostrophe, de tiret, de majuscule ou de St/Saint.
                            Vous pouvez trouver le <strong>nom exact des communes</strong> dans la 
                            <a href="https://geo.api.gouv.fr/decoupage-administratif/communes#name">boîte essayez-moi du service géo des communes</a>. <br>
                            S'il y a plusieurs communes, assurez-vous de les <strong>séparer avec une virgule</strong> (<code>,</code>) (et pas un <code>et</code>)<br>
                            Corrigez le tableau, ré-importez-le pour ré-essayer
                        </p>
                        <p>
                            Si le département n'est pas reconnu, vous pouvez trouver le <strong>nom exact des départements</strong> dans la
                            <a href="https://geo.api.gouv.fr/decoupage-administratif/departements#name">boîte essayez-moi du service géo des départements</a>. <br>
                            Vous pouvez aussi mettre le numéro de département<br>
                            Corrigez le tableau, ré-importez-le pour ré-essayer
                        </p>
                    </details>

                    <div class="fr-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Département principale</th>
                                    <th>Porteur de projet</th>
                                    <th>Nom du projet</th>
                                    <th>Localisation</th>
                                    <th>Objet du projet</th>
                                    <th><abbr title="Autorisation environnementale">AE</abbr></th>
                                    <th>Créer le dossier pré-rempli</th>
                                </tr>
                            </thead>
                            <tbody>
                            {#each [...candidatsDossierÀCréer.values()] as {dossier}}
                                <tr>
                                    <td>{(dossier['Dans quel département se localise majoritairement votre projet ?'] || {}).code}</td>
                                    <td>
                                        <strong>{dossier['Porteur de projet']}</strong> 
                                        {#if dossier['Numéro de SIRET']} (<em>{dossier['Numéro de SIRET']}</em>) {/if}
                                        {#if dossier['Nom du représentant'] || dossier['Prénom du représentant'] || dossier['Adresse mail de contact']} 
                                            <br>
                                            <em>Contact</em><br>
                                            {dossier['Prénom du représentant']} {dossier['Nom du représentant']}
                                            {#if dossier['Adresse mail de contact']}
                                                <br>
                                                {dossier['Adresse mail de contact']}
                                            {/if}
                                        {/if}
                                    </td>
                                    <td>{dossier['Nom du projet']}</td>
                                    <td>
                                        {#if Array.isArray(dossier['Département(s) où se situe le projet'])}
                                            <strong>
                                                {#if dossier['Département(s) où se situe le projet'].length === 1}
                                                    Département :
                                                {:else}
                                                    Départements :
                                                {/if}
                                            </strong>

                                            {#each dossier['Département(s) où se situe le projet'] as département, i}
                                                {#if i !== 0},{/if}
                                                {département.code}
                                            {/each}
                                        {:else}
                                            {#each dossier['Commune(s) où se situe le projet'] || [] as commune, i}
                                                {#if i !== 0},{/if}
                                                {#if typeof commune === 'string'}
                                                    <span class="non-reconnu" title="Nom de commune non reconnu. Ne sera pas pré-remplie dans le dossier">⚠️ {commune}</span>
                                                {:else}
                                                    {commune.nom} ({commune.codeDepartement})
                                                {/if}
                                            {/each}
                                        {/if}
                                    </td>
                                    <td>{dossier['Objet du projet']}</td>
                                    <td>{dossier["Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?"] ? 'oui' : 'non'}</td>
                                    <td><a target="_blank" href={créerLienPréremplissageDémarche(dossier)}>Go !</a></td>
                                </tr>
                            {/each}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
            {/if}

            {#if candidatsAnnotationsÀAjouter}
            <section class="fr-grid-row fr-mb-6w">
                <div class="fr-col">
                    <h2>Dossiers sur lesquels ajouter des annotations privées ({candidatsAnnotationsÀAjouter.size})</h2>
                    
                    <div class="fr-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Département principale</th>
                                    <th>Porteur de projet</th>
                                    <th>Nom du projet</th>
                                    <th>Annoations privées</th>
                                    <th>Ajouter les annotations privées</th>
                                </tr>
                            </thead>
                            <tbody>
                            {#each [...candidatsAnnotationsÀAjouter.values()] as {dossier, annotations}}
                                <tr>
                                    <td>{(dossier['Dans quel département se localise majoritairement votre projet ?'] || {}).code}</td>
                                    <td>
                                        <strong>{dossier['Porteur de projet']}</strong> 
                                        {#if dossier['Numéro de SIRET']} (<em>{dossier['Numéro de SIRET']}</em>) {/if}
                                        {#if dossier['Nom du représentant'] || dossier['Prénom du représentant'] || dossier['Adresse mail de contact']} 
                                            <br>
                                            <em>Contact</em><br>
                                            {dossier['Prénom du représentant']} {dossier['Nom du représentant']}
                                            {#if dossier['Adresse mail de contact']}
                                                <br>
                                                {dossier['Adresse mail de contact']}
                                            {/if}
                                        {/if}
                                    </td>
                                    <td>{dossier['Nom du projet']}</td>
                                    <td>
                                        x
                                    </td>
                                    <td><button disabled>Ajouter</button></td>
                                </tr>
                            {/each}
                            </tbody>
                        </table>
                    </div>

                </div>
            </section>
            {/if}

            {#if candidatsDossiersComplet}
            <section class="fr-grid-row fr-mb-6w">
                <div class="fr-col">
                    <h2>Dossiers créés dans Démarches Simplifiées, avec annotations privées ({candidatsDossiersComplet.size})</h2>
                    <!--
                    <strong>
                        PPP: Tableau replié
                            Les dossiers sont reconnus d'abord par nom de projet
                            puis par nom de porteur (si unique)
                            puis par nom de représentant (si unique)
                    </strong>
                    -->
                </div>
            </section>
            {/if}
        {/await}

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

        p code {
            font-weight: bold;
        }
    }
</style>
