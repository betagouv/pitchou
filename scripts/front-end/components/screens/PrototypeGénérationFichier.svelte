<script>
    //@ts-check
    import Squelette from '../Squelette.svelte'

    let files;

    let nom;
    let dateNaissance

    function onSubmit(e){
        e.preventDefault()

        console.log('générer', files, nom, dateNaissance)
    }

</script>

<Squelette nav={false}>
    <div class="fr-grid-row fr-mt-6w fr-grid-row--center">
        <article class="fr-col">
            <header class="fr-mb-2w">
                <h1>Générer un fichier .odt à partir de données et d'un template .odt</h1>
                <p>⚠️ Prototype ⚠️</p>
            </header>

            <form on:submit={onSubmit}>
                <h2>Charger un template .odt</h2>

                <div class="fr-upload-group">
                    <label class="fr-label" for="file-upload">Importer un template .odt à remplir
                        <!-- <span class="fr-hint-text">Taille maximale : 100 Mo. Formats supportés : ods</span> -->
                    </label>
                    <input bind:files={files} class="fr-upload" type="file" accept=".ods" id="file-upload" name="file-upload">
                </div>

                <h2>Données</h2>

                <div class="fr-input-group">
                    <label class="fr-label" for="text-input-nom">Nom complet</label>
                    <input class="fr-input" bind:value={nom} type="text" id="text-input-nom" name="text-input-nom">

                    <label class="fr-label" for="text-input-nom">Date de naissance</label>
                    <input class="fr-input" bind:value={dateNaissance} type="date" id="text-input-nom" name="text-input-nom">
                </div>

                <button class="fr-btn" type="submit">Générer</button>
            </form>


        </article>
    </div>
</Squelette>

<style lang="scss">
    
</style>
