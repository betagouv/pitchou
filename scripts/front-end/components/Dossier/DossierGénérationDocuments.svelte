<script>
    import {fillOdtTemplate, getOdtTextContent} from '@odfjs/odfjs'
    import {formatLocalisation, formatPorteurDeProjet} from '../../affichageDossier.js'
    import {espècesImpactéesDepuisFichierOdsArrayBuffer} from '../../actions/dossier.js'
    import {créerEspècesGroupéesParImpact} from '../../actions/créerEspècesGroupéesParImpact.js'

    /** @import {DossierComplet} from '../../../types/API_Pitchou' */  

    /** @type {FileList | undefined} */
    let templateFiles;
    $: template = templateFiles && templateFiles[0]



    /** @type {DossierComplet} */
    export let dossier

    /** @type {ReturnType<espècesImpactéesDepuisFichierOdsArrayBuffer> | undefined} */
    let espècesImpactées;

    $: espècesImpactées = (
        dossier.espècesImpactées && dossier.espècesImpactées.contenu && 
        // @ts-ignore
        espècesImpactéesDepuisFichierOdsArrayBuffer(dossier.espècesImpactées.contenu)
    ) || undefined

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
     * @param {SubmitEvent} e
     */
    async function generateDoc(e){
		e.preventDefault()

        if(!template){
            throw new Error(`Missing template`)
        }

		const data = {
            nom: dossier.nom,
            identifiant_onagre: dossier.historique_identifiant_demande_onagre,
            activité_principale: dossier.activité_principale,
            demandeur: formatPorteurDeProjet(dossier),
            localisation: formatLocalisation(dossier),
            régime_autorisation_environnementale: dossier.rattaché_au_régime_ae === null ? '' :
                (dossier.rattaché_au_régime_ae ? 'Oui' : 'Non'),
            espèces_impacts: await espècesImpactéesParActivité
        }

        console.log('data', data)

		const templateAB = await template.arrayBuffer()
		const documentArrayBuffer = await fillOdtTemplate(templateAB, data)
        documentGénéré = new Blob([documentArrayBuffer], {type: template.type});

        const [part1, part2] = template.name.split('.')
        const datetime = (new Date()).toISOString().slice(0, 'YYYY-MM-DD:HH-MM'.length)
		nomDocumentGénéré = `${part1}-${datetime}.${part2}`
	}

</script>

<div class="row">
    <h2>Génération de documents</h2>

    <p>Générer des documents à partir d'un document-type et des données de ce dossier</p>

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

    .texte-document-généré{
        white-space: preserve;
        padding: 1rem;

        background-color: var(--background-contrast-grey);
    }

</style>
