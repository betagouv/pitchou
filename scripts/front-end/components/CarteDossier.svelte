<script>
    /** @import { DossierRésumé } from "../../types/API_Pitchou" **/
    /** @import { default as Dossier } from '../../types/database/public/Dossier.ts' */
	import { formatDateAbsolue, formatLocalisation, formatPorteurDeProjet } from "../affichageDossier"
	import BoutonModale from "./DSFR/BoutonModale.svelte"
    import BadgePhase from "./BadgePhase.svelte"

    /**
     * @typedef Props
     * @property {DossierRésumé} dossier
     * @property {boolean} [dossierSuiviParInstructeurActuel]
     * @property {(id: Dossier["id"]) => Promise<void>} instructeurActuelSuitDossier
     * @property {(id: Dossier["id"]) => Promise<void>} instructeurActuelLaisseDossier
    */
    /** @type {Props}*/
    let { 
            dossier, 
            dossierSuiviParInstructeurActuel, 
            instructeurActuelSuitDossier, 
            instructeurActuelLaisseDossier 
        } = $props()


</script>

<div class="carte fr-p-2w">
    <div class="en-tête">
        <h2>
            <a href={`/dossier/${dossier.id}`} class="fr-link">
                <span class="truncate">{dossier.nom || '(nom non renseigné)'}</span>
                <span class="fr-icon-arrow-right-line" aria-hidden="true"></span>
            </a>
        </h2>
        <div class="boutons-action">
            {#if dossier.commentaire_libre && dossier.commentaire_libre!==''}
                {@const dsfrModaleId = `dsfr-modale-commentaire-${dossier.id}`}
                <BoutonModale id={dsfrModaleId} >
                    {#snippet boutonOuvrir()}
                        <button type="button" class="fr-btn fr-icon-chat-3-line fr-btn--secondary fr-btn--sm" aria-controls={dsfrModaleId} data-fr-opened="false" >
                            Commentaire
                        </button>
                    {/snippet}
                    {#snippet contenu()}
                        <header class="titre-modale">
                            <h1 class="fr-modal__title">
                                Commentaire dossier {dossier.nom}
                            </h1>
                            <h2 class="fr-modal__title">
                                {formatPorteurDeProjet(dossier)}
                                &nbsp;-&nbsp;
                                {formatLocalisation(dossier)}
                            </h2>
                        </header>
                        <div class="contenu-modale">
                            {dossier.commentaire_libre}
                        </div>
                    {/snippet}
                </BoutonModale>
            {/if}
            {#if typeof dossierSuiviParInstructeurActuel === 'boolean'}
                {#if dossierSuiviParInstructeurActuel}
                    <button type="button" class="fr-btn fr-icon-star-fill fr-btn--tertiary-no-outline fr-btn--sm" onclick={() => instructeurActuelLaisseDossier(dossier.id)}>Ne plus suivre</button>
                {:else}
                    <button type="button" class="fr-btn fr-icon-star-line fr-btn--tertiary-no-outline fr-btn--sm" onclick={() => instructeurActuelSuitDossier(dossier.id)}>Suivre</button>
                {/if}
            {/if}
         </div>
    </div>

    <div class="contenu">
        <div class="première-ligne">
            <div>
                <BadgePhase phase={dossier.phase}  />
                <div>
                    <span class="fr-icon-user-shared-2-line fr-icon--sm" aria-hidden="true"></span>
                    {dossier.prochaine_action_attendue_par || '(non renseignée)'}
                </div>
            </div>
            <div>
                <p class="numéro-dossier fr-text--sm">Dossier n°{dossier.id} (DN&nbsp;:&nbsp;{dossier.number_demarches_simplifiées})</p>
                {#if dossier.enjeu_politique || dossier.enjeu_écologique}
                    <p class="fr-badge fr-badge--orange-terre-battue">Dossier à enjeu</p>
                {/if}
            </div>
        </div>
        <div class="deuxième-ligne">
            <div class="date-dépôt">
                <span class="fr-icon-calendar-event-line fr-icon--sm" aria-hidden="true"></span>
                {formatDateAbsolue(dossier.date_dépôt, 'd/MM/yyyy')}
            </div>
            <div class="porteur-et-localisation">
                <span class="fr-icon-group-line fr-icon--sm" aria-hidden="true"></span>
                {formatPorteurDeProjet(dossier) || '(non renseigné)'}
            </div>
            <div class="porteur-et-localisation">
                <span class="fr-icon-map-pin-2-line fr-icon--sm" aria-hidden="true"></span>
                {formatLocalisation(dossier) || '(non renseignée)'}
            </div>
        </div>
    </div>
</div>

<style>
    .carte {
        background: var(--background-default-grey);
        border-radius: 0.25rem;
    }

    .en-tête {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.5rem;

        h2 {
            margin: 0;
            /* Permet d'aligner verticalement le titre avec les boutons d'actions */
            line-height: 1.2rem;
            min-width: 0;

            a {
                color: var(--text-title-grey);
                font-size: 1.25rem;
                line-height: 1.25rem;
                min-width: 0;

                display: flex;
                flex-direction: row;
                gap: 0.5rem;
                
                .truncate {
                    text-overflow: ellipsis; 
                    overflow: hidden;
                    white-space: nowrap;
                }
            }
        }
    }

    .contenu {
        display: flex;
        flex-direction: column;
        gap: 1rem;

        .première-ligne {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            flex-wrap: wrap;
        }

        .première-ligne > div {      
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .deuxième-ligne {
            display: flex;
            flex-direction: row;
            gap: 1rem;
            flex-wrap: wrap;
            .date-dépôt {
                white-space: nowrap;
            }

            .porteur-et-localisation {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                flex: 1;

                @media (max-width: 768px) {
                    flex-basis: 100%;
                }
            }
        }
    }

    .numéro-dossier {
        margin-bottom: 0;
        color: var(--text-mention-grey);
    }

    .titre-modale{
        h1{
            margin-bottom: 0.8rem;
        }
        h2{
            margin-bottom: 0.6rem;
            font-size: 1.1rem;
        }
    }
    .contenu-modale{
        white-space: preserve;
    }
</style>