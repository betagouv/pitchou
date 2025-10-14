<script>
    import {fillOdtTemplate, getOdtTextContent} from '@odfjs/odfjs'
    import {getBalisesGénérationDocument} from '../../../front-end/actions/générerDocument.js'
    import { chargerActivitésMéthodesTransports } from '../../actions/activitésMéthodesTransports.js';

    /** @import {DossierComplet} from '../../../types/API_Pitchou' */
    /** @import {DescriptionMenacesEspèces} from '../../../types/especes.d.ts' */


    /** @type {FileList | undefined} */
    let templateFiles = $state();
    let template = $derived(templateFiles && templateFiles[0])

    /** @type {Error | undefined}*/
    let erreurGénérationDocument = $state();



    /**
     * @typedef {Object} Props
     * @property {DossierComplet} dossier
     * @property {Promise<DescriptionMenacesEspèces> | undefined} espècesImpactées
     */

    /** @type {Props} */
    let { dossier, espècesImpactées } = $props();

    /** @type {Blob | undefined} */
    let documentGénéré = $state();
    /** @type {string | undefined} */
    let urlDocumentGénéré = $derived(documentGénéré && URL.createObjectURL(documentGénéré));
    /** @type {string | undefined} */
    let nomDocumentGénéré = $state()

    /** @type {Promise<string> | undefined} */
    let texteDocumentGénéré = $derived(documentGénéré && documentGénéré.arrayBuffer()
        .then(getOdtTextContent))



    /**
     *
     * @param {SubmitEvent} e
     */
    async function generateDoc(e){
		e.preventDefault()

        if(!template){
            throw new Error(`Missing template`)
        }

        let espèces_impacts = undefined

        const { activitéVersImpactsQuantifiés } = await chargerActivitésMéthodesTransports()

        try{
            // on laisse les erreurs sortir silencieusement ici s'il y en a
            espèces_impacts = await espècesImpactées
        }
        catch(e){
            // @ts-ignore
            erreurGénérationDocument = e
            return;
        }

        if (!espèces_impacts) {
            // @ts-ignore
            erreurGénérationDocument = new Error("Attention, il est impossible de générer des documents pour ce dossier si aucune liste d'espèce n'a été saisie par le pétitionnaire.")
            return;
        }

		const balises = getBalisesGénérationDocument(dossier, espèces_impacts, activitéVersImpactsQuantifiés)

        console.log('balises', balises)

		const templateAB = await template.arrayBuffer()
        try{
            const documentArrayBuffer = await fillOdtTemplate(templateAB, balises)
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

    <form onsubmit={generateDoc}>
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
