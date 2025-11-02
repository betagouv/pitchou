<script>
	import { formatDateAbsolue } from '../../affichageDossier.js'
	import DownloadButton from '../DownloadButton.svelte'

    //@ts-check

    /** @import {DossierComplet} from '../../../types/API_Pitchou.js' */


    /**
     * @typedef {Object} Props
     * @property {DossierComplet} dossier
     */

    /** @type {Props} */
    let { dossier } = $props();

    const {number_demarches_simplifiées: numdos, numéro_démarche} = dossier

    /**
     * @param {{
                contenu: Buffer<ArrayBufferLike>;
                media_type: string;
			}} avis_fichier
     */
    function makeFileContentBlob(avis_fichier) {
        const contenu = new Uint8Array(avis_fichier.contenu.data)
        return new Blob(
            [contenu],
            { type: avis_fichier.media_type },
            );
    }

    /**
     * @param {{ nom: string }} avis_fichier
     */
    function makeFilename(avis_fichier) {
        return avis_fichier.nom; //Est-ce que tous les fichiers ont un nom ???
    }

    /**
     * Tri des avis experts par date la plus récente (date_avis ou date_saisine)
     * du plus récent au plus ancien
     */
    const avisExpertTriés = $derived(dossier.avisExpert.toSorted((avis1, avis2) => {
        // Prendre la date la plus récente entre date_avis et date_saisine pour chaque avis
        const date1 = avis1.date_avis || avis1.date_saisine
        const date2 = avis2.date_avis || avis2.date_saisine
        
        if (!date1 && !date2) return 0
        if (!date1) return 1 // date1 est null, mettre à la fin
        if (!date2) return -1 // date2 est null, mettre à la fin
        
        // Comparer les dates : plus récent en premier (ordre décroissant)
        const time1 = new Date(date1).getTime()
        const time2 = new Date(date2).getTime()
        return time2 - time1
    }))


</script>

<div class="row">

    <section>
        <h2>Avis experts</h2>
        
        {#each avisExpertTriés as avisExpert}
        <div class="carte-avis-expert">
            <h3>{avisExpert.expert ?? 'Expert'} - {avisExpert.avis ?? 'Avis non renseigné'}</h3>
            <ul>
                    <li>
                        <span><strong>Date de l'avis&nbsp;:</strong> {formatDateAbsolue(avisExpert.date_avis)} </span>
                        {#if avisExpert.avis_fichier}
                            <DownloadButton 
                                makeFileContentBlob={() => makeFileContentBlob(
                                    // @ts-ignore ts ne comprend pas qu'avis_fichier est défini
                                    avisExpert.avis_fichier
                                )} 
                                makeFilename={() => makeFilename(
                                    // @ts-ignore ts ne comprend pas qu'avis_fichier est défini
                                    avisExpert.avis_fichier
                                )} 
                                label="Télécharger le fichier de l'avis"
                                classname="fr-btn fr-btn--sm fr-icon-file-download-line fr-btn--icon-left fr-btn--tertiary"
                            />
                        {:else}
                            Aucun fichier de l'avis n'est lié à ce dossier
                        {/if}
                    </li>
                    <li>
                        <span><strong>Date de la saisine&nbsp;:</strong> {formatDateAbsolue(avisExpert.date_saisine)} </span>
                        {#if avisExpert.saisine_fichier}
                            <DownloadButton 
                                makeFileContentBlob={() => makeFileContentBlob(
                                    // @ts-ignore ts ne comprend pas que saisine_fichier est défini
                                    avisExpert.saisine_fichier
                                )} 
                                makeFilename={() => makeFilename(
                                    // @ts-ignore ts ne comprend pas que saisine_fichier est défini
                                    avisExpert.saisine_fichier
                                )} 
                                label="Télécharger le fichier saisine"
                                classname="fr-btn fr-btn--sm fr-icon-file-download-line fr-btn--icon-left fr-btn--tertiary"
                            />
                        {:else}
                            Aucun fichier de saisine n'est lié à ce dossier
                        {/if}
                    </li>
                </ul>
            </div>
        {/each}
    </section>

    <section>
        <a class="fr-btn fr-mr-3w" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/${numéro_démarche}/dossiers/${numdos}/avis_new`}>
            Demander un avis
        </a>
        <a class="fr-btn" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/${numéro_démarche}/dossiers/${numdos}/avis`}>
            Voir les avis
        </a>
    </section>

</div>

<style lang="scss">
    .row{
        display: flex;
        flex-direction: row;

        &>:nth-child(1){
            flex: 3;
        }

        &>:nth-child(2){
            flex: 2;

            text-align: right;
        }
    }

    .carte-avis-expert{
        display:flex;
        flex-direction: column;
        ul {
            list-style: none;
            padding-inline-start: 0;
            display: flex;
            flex-direction: column;
        }
        li {
            display: flex;
            justify-content: space-between;
            gap: 0.5rem;
        }
    }
</style>
