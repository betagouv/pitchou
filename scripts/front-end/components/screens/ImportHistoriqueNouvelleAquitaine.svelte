<script>
    //@ts-check
    import {text} from 'd3-fetch';
    import {getODSTableRawContent, sheetRawContentToObjects} from 'ods-xlsx'

    import Squelette from '../Squelette.svelte'

    import {toDossierTableauSuiviNouvelleAquitaine2023, dossierSuiviNAVersDossierDS88444, dossierSuiviNAVersAnnotationsDS88444} from '../../../import-dossiers-historiques/nouvelle-aquitaine/conversions.js'
    import Loader from '../Loader.svelte';
    // import {formatLocalisation, formatDemandeur, formatDéposant, formatDateRelative} from '../affichageDossier.js'

    /** @import {AnnotationsPriveesDemarcheSimplifiee88444, DossierDemarcheSimplifiee88444} from "../../../types/démarches-simplifiées/DémarcheSimplifiée88444.ts" */
    /** @import {GeoAPICommune, GeoAPIDépartement} from "../../../types/GeoAPI.ts" */
    /** @import { DossierTableauSuiviNouvelleAquitaine2023 } from '../../../import-dossiers-historiques/nouvelle-aquitaine/types.js' */
    /** @import {DossierComplet} from '../../../types.js' */
    //@ts-ignore
    /** @import {default as Dossier} from '../../../types/database/public/Dossier.ts' */
    
    export let email

    /** @type {DossierComplet[]} */
    export let dossiers
    $: dossiersStockésEnBaseDeDonnées = dossiers

    /** @type { Map<GeoAPICommune['nom'], GeoAPICommune> } */
    export let nomToCommune

    /** @type { Map<GeoAPICommune['nom'], GeoAPIDépartement> } */
    export let stringToDépartement

    /** @type { Map<DossierTableauSuiviNouvelleAquitaine2023['Type de projet'], string> } */
    export let typeVersObjet

    /** @type { (_: {dossierId: string, annotations: any}) => Promise<void> } */
    export let remplirAnnotations

    /** @type {FileList | undefined} */
    let fichiersImportRaw;
    
    /** @type {Promise<DossierTableauSuiviNouvelleAquitaine2023[]>} */
    let candidatsImportsSuiviNAP
    /** @type {Map<DossierTableauSuiviNouvelleAquitaine2023, {dossier: Partial<DossierDemarcheSimplifiee88444>, annotations: AnnotationsPriveesDemarcheSimplifiee88444} >} */
    let candidatsImportsMap

    /**
     * 
     * @param {DossierTableauSuiviNouvelleAquitaine2023} candidat
     */
    function estImportable(candidat){
        return (
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
        //@ts-ignore
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

    /**
     * 
     * @param {DossierComplet[]} dossiersStockésEnBaseDeDonnées 
     * @param {Partial<DossierDemarcheSimplifiee88444>} dossierPartiel88444DepuisTableauSuivi
     * @returns {DossierComplet | undefined}
     */
    function trouverDossierEnBDDCorrespondant(dossiersStockésEnBaseDeDonnées, dossierPartiel88444DepuisTableauSuivi){
        const nomProjetDossierCandidat = dossierPartiel88444DepuisTableauSuivi['Nom du projet']
        const dossiersAvecCeNom = dossiersStockésEnBaseDeDonnées.filter(d => d.nom === nomProjetDossierCandidat)
        if(dossiersAvecCeNom.length === 0)
            return undefined
        
        if(dossiersAvecCeNom.length === 1)
            return dossiersAvecCeNom[0]
        
        // dossiersAvecCeNom.length >= 2

        const communesDossierTableauSuivi = dossierPartiel88444DepuisTableauSuivi['Commune(s) où se situe le projet']

        if(Array.isArray(communesDossierTableauSuivi)){
            const dossierAvecNomEt1CommuneEnCommun = dossiersAvecCeNom.find(dossierBDD => {
                return communesDossierTableauSuivi
                    .some(communeTableauSuivi => (dossierBDD['communes'] || [])
                        //@ts-ignore
                        .some(communeDossierBDD => communeTableauSuivi && communeTableauSuivi.code === communeDossierBDD.code)
                    )
            })

            if(dossierAvecNomEt1CommuneEnCommun){
                return dossierAvecNomEt1CommuneEnCommun
            }
        }

        /** @type {GeoAPIDépartement[] | undefined} */
        const départementsDossierTableauSuivi = dossierPartiel88444DepuisTableauSuivi['Département(s) où se situe le projet']
        
        if(Array.isArray(départementsDossierTableauSuivi)){
            const dossierAvecNomEt1DépartementEnCommun = dossiersAvecCeNom.find(dossierBDD => {
                return départementsDossierTableauSuivi
                    .some(départementTableauSuivi => (dossierBDD['départements'] || [])
                        .some(départementDossierBDD => départementTableauSuivi && départementTableauSuivi.code === départementDossierBDD)
                    )
            })

            if(dossierAvecNomEt1DépartementEnCommun){
                return dossierAvecNomEt1DépartementEnCommun
            }
        }

        return undefined
    }

    /**
     * 
     * @param {Dossier} dossierPitchou
     * @param {Partial<AnnotationsPriveesDemarcheSimplifiee88444>} annotationsPartielles 
     * @returns {boolean}
     */
    function dossierAlreadyHasAnnotations(dossierPitchou, annotationsPartielles){

        //@ts-ignore
        /** @type {Record<keyof AnnotationsPriveesDemarcheSimplifiee88444, keyof Dossier>} */
        //@ts-ignore
        const mapping = {
            "Nom du porteur de projet": "historique_nom_porteur",
            "Localisation du projet": "historique_localisation",
            "DDEP nécessaire ?": "ddep_nécessaire",
            "Dossier en attente de": "en_attente_de",
            'Enjeu écologique': "enjeu_écologique",
            'Enjeu politique': "enjeu_politique",
            'Commentaires sur les enjeux et la procédure': "commentaire_enjeu",
            "Commentaires libre sur l'état de l'instruction": "commentaire_libre",
            'Date de réception DDEP': "historique_date_réception_ddep",
            "Date d'envoi de la dernière contribution en lien avec l'instruction DDEP": "historique_date_envoi_dernière_contribution",
            'N° Demande ONAGRE': "historique_identifiant_demande_onagre",
            'Date saisine CSRPN': "historique_date_saisine_csrpn",
            'Date saisine CNPN': "historique_date_saisine_cnpn",
            'Date avis CSRPN': "date_avis_csrpn",
            'Date avis CNPN': "date_avis_cnpn",
            'Date de début de la consultation du public ou enquête publique': "date_consultation_public",
            'Décision': "historique_décision",
            "Date de signature de l'AP": "historique_date_signature_arrêté_préfectoral",
            "Référence de l'AP": "historique_référence_arrêté_préfectoral",
            "Date de l'AM": "historique_date_signature_arrêté_ministériel",
            "Référence de l'AM": "historique_référence_arrêté_ministériel"
        };

        //console.log('Object.entries(annotationsPartielles)', Object.entries(annotationsPartielles))

        for (const [key, value] of Object.entries(annotationsPartielles)) {

            if (value) {
                //@ts-ignore
                const correspondingKey = mapping[key];
                //console.log('key', key, 'values', value, dossierPitchou[correspondingKey])
                //@ts-ignore
                if (dossierPitchou[correspondingKey]) {
                    return true;
                }
            }
        }
        return false;
    }
    
    // Dossiers reconnus

    /** @type {Map<DossierTableauSuiviNouvelleAquitaine2023, {dossier: Partial<DossierDemarcheSimplifiee88444>, annotations: AnnotationsPriveesDemarcheSimplifiee88444} >} */
    /** @type {Map<DossierTableauSuiviNouvelleAquitaine2023, {dossier: any, annotations: AnnotationsPriveesDemarcheSimplifiee88444} >} */
    let candidatsDossierÀCréer
    
    /** @type {Map<DossierTableauSuiviNouvelleAquitaine2023, {dossier: Partial<DossierDemarcheSimplifiee88444>, annotations: AnnotationsPriveesDemarcheSimplifiee88444, dossierPitchou: DossierComplet} >} */
    /** @type {Map<DossierTableauSuiviNouvelleAquitaine2023, {dossier: any, annotations: AnnotationsPriveesDemarcheSimplifiee88444, dossierPitchou: DossierComplet} >} */
    let candidatsAnnotationsÀAjouter

    /** @type {Map<DossierTableauSuiviNouvelleAquitaine2023, {dossier: Partial<DossierDemarcheSimplifiee88444>, annotations: AnnotationsPriveesDemarcheSimplifiee88444, dossierPitchou: DossierComplet} >} */
    /** @type {Map<DossierTableauSuiviNouvelleAquitaine2023, {dossier: any, annotations: AnnotationsPriveesDemarcheSimplifiee88444, dossierPitchou: DossierComplet} >} */
    let candidatsDossiersComplet

    $: if(candidatsImportsMap && dossiersStockésEnBaseDeDonnées) {
        candidatsDossierÀCréer = new Map()
        candidatsAnnotationsÀAjouter = new Map()
        candidatsDossiersComplet = new Map()

        for(const [dossierTableauSuivi, {dossier: dossierPartiel88444, annotations: annotationsPartielle88444}] of candidatsImportsMap){
            const dossierEnBaseDeDonnéeCorrespondant = trouverDossierEnBDDCorrespondant(dossiersStockésEnBaseDeDonnées, dossierPartiel88444)

            if(!dossierEnBaseDeDonnéeCorrespondant){
                candidatsDossierÀCréer.set(dossierTableauSuivi, {dossier: dossierPartiel88444, annotations: annotationsPartielle88444})
            }
            else{
                if(!dossierAlreadyHasAnnotations(dossierEnBaseDeDonnéeCorrespondant, annotationsPartielle88444)){
                    candidatsAnnotationsÀAjouter.set(
                        dossierTableauSuivi, 
                        {dossier: dossierPartiel88444, annotations: annotationsPartielle88444, dossierPitchou: dossierEnBaseDeDonnéeCorrespondant}
                    )
                }
                else{
                    candidatsDossiersComplet.set(
                        dossierTableauSuivi, 
                        {dossier: dossierPartiel88444, annotations: annotationsPartielle88444, dossierPitchou: dossierEnBaseDeDonnéeCorrespondant}
                    )
                }
            }
        }
    }

    let dossierToLienPréremplissage = new Map()

    /** 
     * @param {Partial<DossierDemarcheSimplifiee88444>} dossierPartiel 
     */
    function créerLienPréremplissage(dossierPartiel) {
        dossierToLienPréremplissage.set(
            dossierPartiel,
            text(
                '/lien-preremplissage', 
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(dossierPartiel)
                }
            )
        )

        dossierToLienPréremplissage = dossierToLienPréremplissage // re-render
    }

    let dossierPitchouToRemplissageAnnotation = new Map()

    /**
     * @param {Dossier} dossierPitchou 
     * @param {Partial<AnnotationsPriveesDemarcheSimplifiee88444>} annotations 
     */
    function ajouterAnnotations(dossierPitchou, annotations) {
        dossierPitchouToRemplissageAnnotation.set(
            dossierPitchou,
            remplirAnnotations({
                //@ts-ignore
                dossierId: dossierPitchou.id_demarches_simplifiées,
                annotations
            })
        )

        dossierPitchouToRemplissageAnnotation = dossierPitchouToRemplissageAnnotation // re-render
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
                    <details>
                        <summary>
                            <h2>Dossiers à créer sur Démarches Simplifiées ({candidatsDossierÀCréer.size})</h2>
                        </summary>
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
                                        <td>
                                            {#if dossierToLienPréremplissage.has(dossier)}
                                                {#await dossierToLienPréremplissage.get(dossier)}
                                                    <Loader/>
                                                {:then lienPréremplissage} 
                                                    <a href={lienPréremplissage} target="_blank">Créer le dossier pré-rempli !</a>
                                                {:catch err}
                                                    <strong>Erreur ({err})</strong>
                                                {/await}
                                            {:else}
                                                <button class="fr-btn" type="button" on:click={() => créerLienPréremplissage(dossier)}>Créer un lien de pré-remplissage</button>
                                            {/if}
                                        </td>
                                    </tr>
                                {/each}
                                </tbody>
                            </table>
                        </div>
                    </details>
                </div>
            </section>
            {/if}

            {#if candidatsAnnotationsÀAjouter}
            <section class="fr-grid-row fr-mb-6w">
                <div class="fr-col">
                    <details>
                        <summary>
                            <h2>Dossiers sur lesquels ajouter des annotations privées ({candidatsAnnotationsÀAjouter.size})</h2>
                        </summary>
                    
                        <div class="fr-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Localisation</th>
                                        <th>Porteur de projet</th>
                                        <th>Nom du projet</th>
                                        <th>Dossier sur Démarches Simplifiées</th>
                                        <th>Annotations privées</th>
                                        <th>Ajouter les annotations privées</th>
                                    </tr>
                                </thead>
                                <tbody>
                                {#each [...candidatsAnnotationsÀAjouter.values()] as {dossier, annotations, dossierPitchou}}
                                    <tr>
                                        <td>
                                            <strong>{(dossier['Dans quel département se localise majoritairement votre projet ?'] || {}).code}</strong>
                                            <br>
                                            {annotations['Localisation du projet']}
                                        </td>
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
                                            <a target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${dossierPitchou.number_demarches_simplifiées}`}>
                                                Dossier {dossierPitchou.number_demarches_simplifiées}
                                            </a>
                                        </td>
                                        <td>
                                            <table class="previz-annotations">
                                                <tbody>
                                                    {#each Object.entries(annotations) as [clef, valeur]}
                                                        {#if valeur !== undefined && valeur !== '' && valeur !== null}
                                                            <tr>
                                                                <td><strong>{clef}</strong></td>
                                                                {#if typeof valeur === 'object'}
                                                                    <td>{valeur.toISOString().slice(0, 'YYYY-MM-DD'.length)}</td>
                                                                {:else}
                                                                    <td>{valeur}</td>
                                                                {/if}
                                                            </tr>
                                                        {/if}
                                                    {/each}
                                                </tbody>
                                            </table>
                                        </td>
                                        <td>
                                            {#if dossierPitchouToRemplissageAnnotation.has(dossierPitchou)}
                                                {#await dossierPitchouToRemplissageAnnotation.get(dossierPitchou)}
                                                    <Loader/>
                                                {:then} 
                                                    <strong>Annotations correctement ajoutées&nbsp;!</strong>
                                                    <a target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${dossierPitchou.number_demarches_simplifiées}/annotations-privees`}>Vérifier sur le dossier</a>
                                                {:catch err}
                                                    <strong>Erreur - certaines annotations n'ont pas été remplies ({err})</strong>
                                                {/await}
                                            {:else}
                                                <button class="fr-btn" type="button" on:click={() => ajouterAnnotations(dossierPitchou, annotations)}>Ajouter</button>
                                            {/if}
                                        </td>
                                    </tr>
                                {/each}
                                </tbody>
                            </table>
                        </div>
                    </details>
                </div>
            </section>
            {/if}

            {#if candidatsDossiersComplet}
            <section class="fr-grid-row fr-mb-6w">
                <div class="fr-col">
                    <details>
                        <summary>
                            <h2>Dossiers complets dans Démarches Simplifiées ({candidatsDossiersComplet.size})</h2>
                        </summary>

                        <div class="fr-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Localisation</th>
                                        <th>Porteur de projet</th>
                                        <th>Nom du projet</th>
                                        <th>Dossier sur Démarches Simplifiées</th>
                                        <th>Annotations sur Démarches Simplifiées</th>
                                    </tr>
                                </thead>
                                <tbody>
                                {#each [...candidatsDossiersComplet.values()] as {dossier, annotations, dossierPitchou}}
                                    <tr>
                                        <td>
                                            <strong>{(dossier['Dans quel département se localise majoritairement votre projet ?'] || {}).code}</strong>
                                            <br>
                                            {annotations['Localisation du projet']}
                                        </td>
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
                                            <a target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${dossierPitchou.number_demarches_simplifiées}`}>
                                                Dossier {dossierPitchou.number_demarches_simplifiées}
                                            </a>
                                        </td>
                                        <td>
                                            <a target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${dossierPitchou.number_demarches_simplifiées}/annotations-privees`}>
                                                Annotations privées
                                            </a>
                                        </td>
                                    </tr>
                                {/each}
                                </tbody>
                            </table>
                        </div>
                    </details>
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

        table.previz-annotations{
            td{
                max-width: 10rem;
                overflow: hidden;
            }
        }
    }

    details {
        cursor: auto;

        &> summary{
            &> h2 {
                display: inline-block;
            }

            &::marker{
                content: '';
            }

            &::after{
                font-size: 0.9em;
                display: inline-block;
                vertical-align: middle;
                
                border-radius: 5px;

                padding: 2px 0.5rem;
                margin: 0 1em;

                border: 1px solid var(--text-action-high-blue-france);
                color: var(--text-action-high-blue-france);
            }
        }

        &:not([open]) > summary::after{
            content: 'Déplier ▼'
        }
        

        &[open] > summary::after{
            content: 'Replier ▲'
        }

    }
</style>
