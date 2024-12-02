<script>
    //@ts-check

    import Squelette from '../Squelette.svelte'
    import {formatDateRelative, formatDateAbsolue} from '../../affichageDossier.js'

    /** @import {DossierComplet} from '../../../types.js' */

    /** @type {DossierComplet} */
    export let dossier

    const {number_demarches_simplifiées: numdos} = dossier

    /** @type {string | undefined} */
    export let email


</script>

<Squelette {email}>
    <div class="fr-grid-row fr-mt-4w">
        <div class="fr-col">
            <h1 class="fr-mb-6w">Description dossier {dossier.nom_dossier || "sans nom"}</h1>

            <article class="fr-p-3w fr-mb-4w">
                <h2>Espèces protégées menacées</h2>
                {#if dossier.url_fichier_espèces}
                    {dossier.url_fichier_espèces}
                {:else if dossier.espèces_protégées_concernées}
                    <!-- Cette section est amenée à disparatre avec la fin de la transmission des espèces via un lien -->
                    <div>"Lien" ou description libre fournie par le pétitionnaire
                        PPP : rajouter un lien vers saisie-espèces pour encourager à créer un fichier

                    </div>
                    <pre>{dossier.espèces_protégées_concernées}</pre>
                {:else}
                    <p>Aucune données sur les espèces protégées n'a été fournie par le pétitionnaire</p>
                {/if}

            </article>
        </div>
    </div>
</Squelette>

<style lang="scss">
    article {
        background-color: var(--background-alt-grey);
    }

    section {
        margin-bottom: 3rem;
    }

</style>
