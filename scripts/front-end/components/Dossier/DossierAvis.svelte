<script>
	import { urlDémarchesSimplifiées } from '../../../commun/constantes.js'
	import { formatDateAbsolue } from '../../affichageDossier.js'

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
        {#if dossier.avisExpert.length >= 1}
            {#each dossier.avisExpert as avisExpert}
                <div class="carte-avis-expert">
                <h3>{avisExpert.expert ?? 'Expert'} - {avisExpert.avis ?? 'Avis non renseigné'}</h3>
                    <ul>
                        <li>
                            <span><strong>Date de l'avis&nbsp;:</strong> {formatDateAbsolue(avisExpert.date_avis)} </span>
                            {#if avisExpert.avis_fichier_url}
                                <a class="fr-btn fr-btn--secondary fr-btn--sm" href={avisExpert.avis_fichier_url}>
                                    Télécharger le fichier de l'avis
                                </a>
                            {:else}
                                Aucun fichier de l'avis n'est lié à ce dossier
                            {/if}
                        </li>
                        <li>
                            <span><strong>Date de la saisine&nbsp;:</strong> {formatDateAbsolue(avisExpert.date_saisine)} </span>
                            {#if avisExpert.saisine_fichier_url}
                                <a class="fr-btn fr-btn--secondary fr-btn--sm" href={avisExpert.saisine_fichier_url}>
                                    Télécharger le fichier saisine
                                </a>
                            {:else}
                                Aucun fichier de saisine n'est lié à ce dossier
                            {/if}
                        </li>
                    </ul>
                </div>
            {/each}
        {:else}
            Aucun fichier de saisine ou fichier d'avis d'expert n'est associé à ce dossier.
        {/if}
    </section>

    <section>
        <a class="fr-btn" target="_blank" href={`${urlDémarchesSimplifiées}/procedures/${numéro_démarche}/dossiers/${numdos}/avis_new`}>
            Demander un avis
        </a>
        <a class="fr-btn fr-btn--secondary" target="_blank" href={`${urlDémarchesSimplifiées}/procedures/${numéro_démarche}/dossiers/${numdos}/avis`}>
            Voir la page Avis sur Démarches Simplifiées
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
