<script>
    import {fillOdtTemplate} from '@odfjs/odfjs'

    /** @import {DossierComplet} from '../../../types/API_Pitchou' */  

    /** @type {FileList | undefined} */
    let templateFiles;
    $: template = templateFiles && templateFiles[0]


    /** @type {DossierComplet} */
    export let dossier

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
            nom: dossier.nom
		}

		const templateAB = await template.arrayBuffer()
		const documentArrayBuffer = await fillOdtTemplate(templateAB, data)
        const blob = new Blob([documentArrayBuffer], {type: template.type});

		download(blob, template.name)
	}

    /**
     * 
     * @param {Blob} blob
     * @param {string} filename
     */
    async function download(blob, filename){
        const link = document.createElement("a");
        link.download = filename;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
</div>


<style lang="scss">
    .fr-upload-group{
        margin-bottom: 1rem;
    }
</style>
