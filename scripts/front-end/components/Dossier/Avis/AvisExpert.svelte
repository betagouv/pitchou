<script>
	import { formatDateAbsolue } from '../../../affichageDossier.js'
	import FormulaireAvisExpert from './FormulaireAvisExpert.svelte'
    /** @import { DossierComplet, FrontEndAvisExpert } from '../../../../types/API_Pitchou.js' */
    /**
     * @typedef {Object} Props
     * @property {Pick<DossierComplet, 'id'>} dossier
     * @property {FrontEndAvisExpert} avisExpert
     * @property {(avisExpert: FrontEndAvisExpert) => void} supprimerAvisExpert
    */

    /** @type {Props} */
    let { dossier, avisExpert, supprimerAvisExpert } = $props()

    /** @type {boolean} */
    let avisExpertEnModification = $state(false)


</script>

<div class="carte-avis-expert">
    <h3>{avisExpert.expert ?? 'Expert'} - {avisExpert.avis ?? 'Avis non renseigné'}</h3>
    {#if !avisExpertEnModification}
        <button class="fr-btn fr-btn--secondary" type="button" onclick={() => avisExpertEnModification = true}>Modifier</button>
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
    {:else}
        <button class="fr-btn fr-btn--secondary" type="button" onclick={() => supprimerAvisExpert(avisExpert)}>Supprimer</button>
        <FormulaireAvisExpert {dossier} bind:avisExpertInitial={avisExpert} fermerLeFormulaire={() => avisExpertEnModification = false} />
    {/if}
</div>

<style>
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