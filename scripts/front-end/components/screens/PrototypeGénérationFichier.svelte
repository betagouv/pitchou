<script>
    //@ts-check
    import Squelette from '../Squelette.svelte'
    import DownloadButton from '../DownloadButton.svelte'

    /** @type {HTMLInputElement} */
    let templateInput;

    let files;
    $: template = files && files[0]

    let nom = 'David Bruant';
    let dateNaissance = '1987-03-08';

    // preload un template en dur pour la fun
    fetch('/outils/template-1.odt')
        .then(r => r.blob())
        .then(blob => {
            //console.log('blob', blob)

            const file = new File([blob], 'template.odt')
            let container = new DataTransfer(); 
            container.items.add(file);
            templateInput.files = container.files;
            files = templateInput.files
        })



    function makeFileContentBlob(){
        const formData = new FormData()

        if(template){
            formData.set('template', template)

            // va peut-être jeter une exception
            const données = JSON.stringify({nom, dateNaissance})

            formData.set('données', données)

            return fetch('/prototype/generer-fichier', {
                method: 'POST',
                body: formData
            })
            .then(r => r.blob())
        }   
    }

</script>

<Squelette nav={false}>
    <div class="fr-grid-row fr-mt-6w fr-grid-row--center">
        <article class="fr-col">
            <header class="fr-mb-2w">
                <h1>Générer un fichier .odt à partir de données et d'un template .odt</h1>
                <p>⚠️ Prototype ⚠️</p>
            </header>

            <section>
                <h2>Charger un template .odt</h2>

                <div class="fr-upload-group">
                    <label class="fr-label" for="file-upload">Importer un template .odt à remplir
                        <!-- <span class="fr-hint-text">Taille maximale : 100 Mo. Formats supportés : odt</span> -->
                    </label>
                    <input bind:this={templateInput} bind:files={files} class="fr-upload" type="file" accept=".odt, .ods" id="file-upload" name="file-upload">
                </div>

                <h2>Données</h2>

                <div class="fr-input-group">
                    <label class="fr-label" for="text-input-nom">Nom complet</label>
                    <input class="fr-input" bind:value={nom} type="text" id="text-input-nom" name="text-input-nom">

                    <label class="fr-label" for="text-input-nom">Date de naissance</label>
                    <input class="fr-input" bind:value={dateNaissance} type="date" id="text-input-nom" name="text-input-nom">
                </div>

                {#if template}
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
</style>
