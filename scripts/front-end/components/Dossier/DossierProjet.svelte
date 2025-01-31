<script>
    //@ts-check
    import DownloadButton from '../DownloadButton.svelte';
    import Loader from '../Loader.svelte';
    import NomEspèce from '../NomEspèce.svelte';
    import {espècesImpactéesDepuisFichierOdsArrayBuffer} from '../../actions/dossier.js'
    import { etresVivantsAtteintsCompareEspèce } from '../../espèceFieldset';

    /** @import {DossierComplet} from '../../../types/API_Pitchou.ts' */

    /** @type {DossierComplet} */
    export let dossier

    const {number_demarches_simplifiées: numdos} = dossier

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

    $: espècesImpactées = dossier.espècesImpactées && dossier.espècesImpactées.contenu && 
        espècesImpactéesDepuisFichierOdsArrayBuffer(dossier.espècesImpactées.contenu)

    $: espècesImpactéesUniquesTriées = espècesImpactées && espècesImpactées.then(espècesImpactées => {
        if(espècesImpactées){
            return Object.fromEntries(
                Object.entries(espècesImpactées)
                    .map(([classif, espècesImpactées]) => 
                        [
                            classif, 
                            [...new Set(
                                espècesImpactées
                                    .toSorted(etresVivantsAtteintsCompareEspèce)
                                    // @ts-ignore
                                    .map(({espèce}) => espèce)
                            )]
                        ]
                    )
            )
        }
    })

</script>

<a class="fr-btn fr-btn--secondary fr-mb-1w" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}`}>Dossier sur Démarches Simplifiées</a>


<h2>Espèces impactées</h2>
{#if dossier.espècesImpactées}
    <DownloadButton 
        {makeFileContentBlob}
        {makeFilename}
        label="Télécharger le fichier des espèces impactées"
    ></DownloadButton>

    <h3>Liste</h3>

    {#await espècesImpactéesUniquesTriées}
        <Loader></Loader>
    {:then espècesImpactéesUniquesTriées} 
        {#if espècesImpactéesUniquesTriées}
            {#each Object.keys(espècesImpactéesUniquesTriées) as classif}
                {#if espècesImpactéesUniquesTriées[classif].length >= 1}
                    <section class="liste-especes">
                        <h3>Liste des {classif}</h3>
                        {#each espècesImpactéesUniquesTriées[classif] as espèce, index (espèce) }
                            {#if index !== 0 },&nbsp;{/if}<NomEspèce espèce={espèce}/>
                        {/each}
                    </section>
                {/if}
            {/each}
        {/if}
    {:catch erreur}
        <div class="fr-alert fr-alert--error fr-mb-3w">
            {#if erreur.name === 'HTTPError'}
                Erreur de réception du fichier. Veuillez réessayer en rafraichissant la page maintenant ou plus tard.
            {:else if erreur.name === 'MediaTypeError'}
                Le fichier d'espèces impactées dans le dossier n'est pas d'un type qui permet de récupérer la liste des espèces.
                Un fichier .ods est attendu. Le fichier dans le dossier est le type <code>{erreur.obtenu}</code>.
                Vous pouvez demander au pétitionnaire de fournir le fichier dans le bon format à la place du fichier actuel.
            {:else}
                Une erreur est survenue. Veuillez réessayer en rafraichissant la page maintenant ou plus tard.
            {/if}
        </div>
    {/await}

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


<style lang="scss">
    pre{
        white-space: pre-wrap;
    }
</style>
