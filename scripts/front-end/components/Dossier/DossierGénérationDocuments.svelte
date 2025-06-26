<script>
    import {format} from 'date-fns'
    import {fr} from 'date-fns/locale';

    import {fillOdtTemplate, getOdtTextContent} from '@odfjs/odfjs'
    import {formatLocalisation, formatPorteurDeProjet} from '../../affichageDossier.js'
    import {créerEspècesGroupéesParImpact} from '../../actions/créerEspècesGroupéesParImpact.js'

    /** @import {DossierComplet} from '../../../types/API_Pitchou' */
    /** @import {DescriptionMenacesEspèces} from '../../../types/especes.d.ts' */


    /** @type {FileList | undefined} */
    let templateFiles;
    $: template = templateFiles && templateFiles[0]

    /** @type {Error | undefined}*/
    let erreurGénérationDocument;


    /** @type {DossierComplet} */
    export let dossier

    /** @type {Promise<DescriptionMenacesEspèces> | undefined} */
    export let espècesImpactées;

    /** @type {ReturnType<créerEspècesGroupéesParImpact> | undefined} */
    let espècesImpactéesParActivité

    $: espècesImpactéesParActivité = espècesImpactées && espècesImpactées.then(créerEspècesGroupéesParImpact)
    //.catch(err => console.error('err', err))

    /** @type {Blob | undefined} */
    let documentGénéré;
    /** @type {string | undefined} */
    $: urlDocumentGénéré = documentGénéré && URL.createObjectURL(documentGénéré);
    /** @type {string | undefined} */
    let nomDocumentGénéré

    /** @type {Promise<string> | undefined} */
    $: texteDocumentGénéré = documentGénéré && documentGénéré.arrayBuffer()
        .then(getOdtTextContent)


    /**
     * 
     * @param {any} n
     * @param {number} precision
     * @returns {string | undefined}
     */
    function afficher_nombre(n, precision = 2){
        if(typeof n === 'string'){
            n = parseFloat(n)
        }

        if(typeof n === 'number'){
            if(Number.isNaN(n)){
                return '(erreur de calcul)'
            }

            if(Number.isInteger(n))
                return n.toString(10)
            else{
                return n.toFixed(precision)
            }
        }

        return undefined
    }

    /**
     * 
     * @param {any} date
     * @param {string} formatString
     * @returns {string | undefined}
     */
    function formatter_date(date, formatString){
        if(!date)
            return undefined
        date = new Date(date)
        return format(date, formatString, { locale: fr })
    }


    /**
     * 
     * @param {any} date
     * @returns {string | undefined}
     */
    function formatter_date_simple(date){
        return formatter_date(date, 'd MMMM yyyy')
    }

    /**
     * 
     * @param {SubmitEvent} e
     */
    async function generateDoc(e){
		e.preventDefault()

        if(!template){
            throw new Error(`Missing template`)
        }

        const functions = {
            afficher_nombre,
            formatter_date,
            formatter_date_simple
        }

        const {
            nom,
            description,
            justification_absence_autre_solution_satisfaisante,
            motif_dérogation,
            justification_motif_dérogation,
            date_début_intervention,
            date_fin_intervention,
            durée_intervention,
            historique_identifiant_demande_onagre,
            activité_principale,
            rattaché_au_régime_ae,
            scientifique_type_demande,
            scientifique_description_protocole_suivi,
            scientifique_mode_capture,
            scientifique_modalités_source_lumineuses,
            scientifique_modalités_marquage,
            scientifique_modalités_transport,
            scientifique_périmètre_intervention,
            scientifique_intervenants,
            scientifique_précisions_autres_intervenants
        } = dossier

        let espèces_impacts = undefined

        try{
            // on laisse les erreurs sortir silencieusement ici s'il y en a
            espèces_impacts = await espècesImpactéesParActivité
        }
        catch(e){
            // ignore errors
        }


		const data = {
            nom,
            description,
            justification_absence_autre_solution_satisfaisante,
            motif_dérogation,
            justification_motif_dérogation,
            identifiant_onagre: historique_identifiant_demande_onagre,
            activité_principale,
            date_début_intervention,
            date_fin_intervention,
            durée_intervention,
            demandeur: formatPorteurDeProjet(dossier),
            localisation: formatLocalisation(dossier),
            régime_autorisation_environnementale_renseigné: rattaché_au_régime_ae !== null,
            régime_autorisation_environnementale: rattaché_au_régime_ae===null ? 'Non renseigné':rattaché_au_régime_ae,
            liste_espèces_par_impact: espèces_impacts?.map(({espèces,activité,impactsQuantifiés}) => ({
                liste_espèces: espèces.map(({nomVernaculaire,nomScientifique, détails}) => ({
                    nomVernaculaire,
                    nomScientifique,
                    liste_impacts_quantifiés:détails,
                })),
                impact: activité,
                liste_noms_impacts_quantifiés: impactsQuantifiés,
            }) ),
            scientifique: {
                type_demande: scientifique_type_demande,
                description_protocole_suivi: scientifique_description_protocole_suivi,
                mode_capture: scientifique_mode_capture,
                modalités_source_lumineuses: scientifique_modalités_source_lumineuses,
                modalités_marquage: scientifique_modalités_marquage,
                modalités_transport: scientifique_modalités_transport,
                périmètre_intervention: scientifique_périmètre_intervention,
                intervenants: scientifique_intervenants,
                précisions_autres_intervenants: scientifique_précisions_autres_intervenants,
            },
            identifiant_pitchou: dossier.id,
            ...functions
        }

        console.log('data', data)

		const templateAB = await template.arrayBuffer()
        try{
            const documentArrayBuffer = await fillOdtTemplate(templateAB, data)
            documentGénéré = new Blob([documentArrayBuffer], {type: template.type});

            const [part1, part2] = template.name.split('.')
            const datetime = (new Date()).toISOString().slice(0, 'YYYY-MM-DD:HH-MM'.length)
            nomDocumentGénéré = `${part1}-${datetime}.${part2}`
        }
        catch(err){
            // @ts-ignore
            erreurGénérationDocument = err
        }
	}

</script>

<div class="row">
    <h2>Génération de documents</h2>

    <p>
        Générer des documents à partir d'un <a target="_blank" href="https://betagouv.github.io/pitchou/instruction/document-types/">document-type</a> et des données de ce dossier
        <br>
        Vous pouvez <a target="_blank" href="https://betagouv.github.io/pitchou/instruction/document-types/creation.html">créer vos propres document-types</a>
    </p>

    {#if erreurGénérationDocument}
        <div class="fr-alert fr-alert--error fr-mb-3w">
            <h3 class="fr-alert__title">Erreur lors de la génération du document :</h3>
            <p>{erreurGénérationDocument}</p>
        </div>
    {/if}

    <form on:submit={generateDoc}>
        <div class="fr-upload-group">
            <label class="fr-label" for="file-upload">Ajouter un document-type
                <!--
                    <span class="fr-hint-text">Taille maximale : 500 Mo. Formats supportés : jpg, png, pdf. Plusieurs fichiers possibles. Lorem ipsum dolor sit amet, consectetur adipiscing.</span>
                -->
            </label>
            <input bind:files={templateFiles} class="fr-upload" type="file" accept=".odt" id="file-upload">
        </div>

        <button class="fr-btn" type="submit" disabled={!template}>Générer le document !</button>
    </form>

    {#if documentGénéré && nomDocumentGénéré}
        <div>            
            <a class="fr-link fr-link--download" download={nomDocumentGénéré} href={urlDocumentGénéré}>
                Télécharger le document généré
            </a>
            <details>
                <summary>Voir le texte brut</summary>
                {#await texteDocumentGénéré}
                    (... en chargement ...)
                {:then texte} 
                    <div class="texte-document-généré">{texte}</div>
                {/await}
            </details>

        </div>
    {/if}
</div>


<style lang="scss">
    form{
        margin-bottom: 2rem;

        .fr-upload-group{
            margin-bottom: 2rem;
        }
    }

    details{
        cursor: initial;

        summary{
            cursor: pointer;

        }
    }

    .texte-document-généré{
        white-space: preserve;
        padding: 1rem;

        background-color: var(--background-contrast-grey);
    }

</style>
