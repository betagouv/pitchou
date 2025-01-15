<script>
    import DownloadButton from '../DownloadButton.svelte';

    //@ts-check

    import Squelette from '../Squelette.svelte'

    /** @import {DossierComplet} from '../../../types/API_Pitchou.ts' */

    /** @type {DossierComplet} */
    export let dossier

    /** @type {string | undefined} */
    export let email = undefiend

    function makeFileContentBlob() {
        return new Blob(
            // @ts-ignore
            [dossier.espècesImpactées && dossier.espècesImpactées.contenu], 
            {type: dossier.espècesImpactées && dossier.espècesImpactées.media_type}
        )
    }

    function makeFilename() {
        return dossier.espècesImpactées?.nom || 'fichier'
    } 

</script>

<Squelette {email}>
    <div class="fr-grid-row fr-mt-4w">
        <div class="fr-col">
            <h1 class="fr-mb-6w">Description dossier {dossier.nom || "sans nom"}</h1>

            <article class="fr-p-3w fr-mb-4w">
                <h2>Espèces impactées</h2>
                {#if dossier.espècesImpactées}
                    <DownloadButton 
                        {makeFileContentBlob}
                        {makeFilename}
                        label="Télécharger le fichier des espèces impactées"
                    ></DownloadButton>
                {:else if dossier.espèces_protégées_concernées}
                    <!-- Cette section est amenée à disparatre avec la fin de la transmission des espèces via un lien -->
                    <p>Le pétitionnaire n'a pas encore transmis de fichier, mais il a transmis ceci :</p>
                    
                    <pre>{dossier.espèces_protégées_concernées}</pre>
                    <p>
                        <strong>Recommandation&nbsp;:</strong> l'inviter à plutôt transmettre 
                        <a href="/saisie-especes">un fichier qu'il peut créer sur Pitchou</a>,
                        puis déposer ce fichier au bon endroit sur son dossier sur Démarches Simplifiées
                    </p>
                {:else}
                    <p>Aucune données sur les espèces impactées n'a été fournie par le pétitionnaire</p>
                {/if}

            </article>
        </div>
    </div>
</Squelette>

<style lang="scss">
    article {
        background-color: var(--background-alt-grey);

        pre{
            white-space: pre-wrap;
        }
    }


</style>
