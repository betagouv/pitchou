<script>
    //@ts-check
    import Squelette from '../Squelette.svelte'
    import DownloadButton from '../DownloadButton.svelte'

    /** @type {HTMLInputElement} */
    let templateInput;

    /** @type {FileList | undefined} */
    let templateFiles;
    $: template = templateFiles && templateFiles[0]

    /** @type {FileList | undefined} */
    let dataFiles;
    $: data = dataFiles && dataFiles[0]

    // preload un template en dur pour la fun
    fetch('/data/génération-fichiers/template-anniversaire.odt')
        .then(r => r.blob())
        .then(blob => {
            //console.log('blob', blob)

            const file = new File([blob], 'template-anniversaire.odt')
            let container = new DataTransfer(); 
            container.items.add(file);
            templateInput.files = container.files;
            templateFiles = templateInput.files
        })


    function makeFileContentBlob(){
        const formData = new FormData()

        if(!template)
            throw new Error(`Document-type manquant`)

        if(!data){
            throw new Error(`Données manquantes`)
        }
            
        formData.set('template', template)
        formData.set('données', data)

        return fetch('/prototype/generer-fichier', {
                method: 'POST',
                body: formData
            })
            .then(r => r.blob())
        
    }

</script>

<Squelette nav={false}>
    <div class="fr-grid-row fr-mt-6w fr-grid-row--center">
        <article class="fr-col">
            <header class="fr-mb-2w">
                <h1>Générer un fichier .odt à partir de données et d'un document-type .odt</h1>
                <p>⚠️ Prototype ⚠️</p>
            </header>

            <section>
                <h2>Charger un document-type .odt</h2>

                <p>
                    Dans ce fichier, il peut y avoir des endroits à remplir indiqués par <code>&lbrace;d.aRemplir&rbrace;</code>. 
                    Ces endroits commencent par <code>&lbrace;d.</code> et se terminent par <code>&rbrace;</code>.
                    <br>
                    La syntaxe complète est 
                    <a href="https://carbone.io/documentation/design/overview/getting-started.html">documentée sur le site de carbone.io (en anglais)</a>
                </p>

                <div class="fr-upload-group">
                    <label class="fr-label" for="file-upload-template">Importer un document-type .odt à remplir
                        <!-- <span class="fr-hint-text">Taille maximale : 100 Mo. Formats supportés : odt</span> -->
                    </label>
                    <input bind:this={templateInput} bind:files={templateFiles} class="fr-upload" type="file" accept=".odt, .ods" id="file-upload-template" name="file-upload-template">
                </div>

                <h2>Charger un fichier de données .ods</h2>

                <p>
                    Ce fichier est un tableau dont la première ligne définit les noms de colonnes.
                    Ces colonnes doivent correspondre aux endroits à remplir dans le document-type.
                    Par exemple, si le document-type contient <code>&lbrace;d.nom&rbrace;</code> et 
                    <code>&lbrace;d.dateNaissance&rbrace;</code>, alors le fichier de données doit avoir
                    des colonnes <code>nom</code> et <code>dateNaissance</code>
                </p>

                <div class="fr-upload-group">
                    <label class="fr-label" for="file-upload-data">Importer un fichier de données .ods
                        <!-- <span class="fr-hint-text">Taille maximale : 100 Mo. Formats supportés : odt</span> -->
                    </label>
                    <input bind:files={dataFiles} class="fr-upload" type="file" accept=".ods" id="file-upload-data" name="file-upload-data">
                </div>

                {#if template && data}
                    <DownloadButton
                        label="Générer fichier"
                        makeFileContentBlob={makeFileContentBlob}
                        makeFilename={() => 'Fichier.odt'}
                    ></DownloadButton>
                {:else}
                    <button class="fr-btn fr-btn--lg" disabled>Générer fichier</button>
                {/if}
                
            </section>

        </article>
    </div>
</Squelette>

<style lang="scss">
    article{
        margin-bottom: 4rem;
    }

    .fr-upload-group{
        margin-bottom: 2rem;
    }
</style>
