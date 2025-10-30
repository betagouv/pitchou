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

</script>

<div class="row">

    <section>
        <h2>Avis experts</h2>

        {#each dossier.avisExpert as avisExpert}
            <div class="carte-avis-expert">
                <h3>{avisExpert.expert ?? 'Expert'} - {avisExpert.avis ?? 'Avis non renseigné'}</h3>
                <ul>
                    <span><strong>Date de l'avis&nbsp;:</strong> {formatDateAbsolue(avisExpert.date_avis)} </span>
                    {#if avisExpert.avis_fichier}
                        <DownloadButton 
                            makeFileContentBlob={() => new Blob(['test'])}
                            makeFilename={() => 'avis'}
                            label="Télécharger le fichier de l'avis"
                            classname="fr-btn fr-btn--sm fr-icon-file-download-line fr-btn--icon-left fr-btn--tertiary"
                        />
                    {:else}
                        Aucun fichier d'avis n'est lié à ce dossier
                    {/if}
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
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: center;
            gap: 0.5rem 1rem;
        }
        li {
            display: contents;
        }
    }
</style>
