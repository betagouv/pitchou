<script>
	import { formatDateAbsolue } from '../../../affichageDossier.js'
	import FormulaireAvisExpert from './FormulaireAvisExpert.svelte'
    /** @import { DossierComplet, FrontEndAvisExpert } from '../../../../types/API_Pitchou.js' */
    /**
     * @typedef {Object} Props
     * @property {DossierComplet['id']} dossierId
     * @property {FrontEndAvisExpert} avisExpert
     * @property {(avisExpert: FrontEndAvisExpert) => void} supprimerAvisExpert
    */

    /** @type {Props} */
    let { dossierId, avisExpert, supprimerAvisExpert } = $props()

    /** @type {boolean} */
    let avisExpertEnModification = $state(false)

    function fermerLeFormulaire() {
        avisExpertEnModification = false
    }

    /**
     * @param {FrontEndAvisExpert} avisExpert
     */
    function onClickSupprimer(avisExpert) {
        supprimerAvisExpert(avisExpert)
        fermerLeFormulaire()
    }


</script>

<div class="carte-avis-expert">
    <div class="titre">
        <h3 class="fr-h5">{avisExpert.expert ?? 'Expert'} - {avisExpert.avis ?? "Avis en attente"}</h3>
        {#if !avisExpertEnModification}
            <button class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-pencil-line" type="button" onclick={() => avisExpertEnModification = true}>Modifier</button>
        {/if}
    </div>
    {#if !avisExpertEnModification}
        <ul>
            {#if avisExpert.avis_fichier_url || avisExpert.date_avis || avisExpert.avis === 'Avis favorable tacite'}
                <li>
                    <span><strong>Date de l'avis&nbsp;:</strong> {formatDateAbsolue(avisExpert.date_avis)} </span>
                    {#if avisExpert.avis_fichier_url}
                        <a class="fr-btn fr-btn--secondary fr-btn--sm" href={avisExpert.avis_fichier_url}>
                            Télécharger le fichier de l'avis
                        </a>
                    {:else if avisExpert.avis === 'Avis favorable tacite'}
                        Avis favorable tacite
                    {:else}
                        Aucun fichier de l'avis n'est lié à ce dossier
                    {/if}
                </li>
            {/if}
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
        <FormulaireAvisExpert dossierId={dossierId} bind:avisExpertInitial={avisExpert} {fermerLeFormulaire} />
        <button class="fr-btn fr-btn--secondary fr-mt-1w" type="button" onclick={() => onClickSupprimer(avisExpert)}>Supprimer cet avis d'expert</button>
    {/if}
</div>

<style lang="scss">
    .titre {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 1rem;
    } 
    .carte-avis-expert {
        display: flex;
        flex-direction: column;
        padding: 1.5rem;
        border: 1px solid var(--border-default-grey);
        border-radius: 4px;
        background-color: var(--background-default-grey);
        
        ul {
            list-style: none;
            padding-inline-start: 0;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            margin: 0;
        }
        
        li {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 0;
        }
        
        h3 {
            margin: 0;
        }
    }
</style>