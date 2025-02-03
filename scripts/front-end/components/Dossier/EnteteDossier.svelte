<script>
    /** @import {DossierComplet} from '../../../types/API_Pitchou' */

    import {formatLocalisation, formatDéposant} from '../../affichageDossier.js'
    import {afficherString} from '../../affichageValeurs.js'
    import TagPhase from '../TagPhase.svelte'

    /** @type {DossierComplet} */
    export let dossier

    let phase = dossier.évènementsPhase[0].phase

</script>

<header class="fr-mb-2w">
    <section>

        <h1 class="fr-mb-1v">{dossier.nom}</h1>
        <div>
            <span class="fr-icon-map-pin-2-fill" aria-hidden="true"></span>
            {formatLocalisation(dossier)}
        </div>
        <div>
            <span class="fr-icon-user-fill" aria-hidden="true"></span>
            {formatDéposant(dossier)}
        </div>
        <div>
            <span class="fr-icon-briefcase-fill" aria-hidden="true"></span>
            {dossier.activité_principale}
        </div>
    </section>

    <section>

        <div>
            <strong>Phase&nbsp;:&nbsp;</strong><TagPhase {phase}></TagPhase>
        </div>
        
        <div>
            <strong>Prochaine action de&nbsp;:&nbsp;</strong>
            {afficherString(dossier.prochaine_action_attendue_par)}
        </div>

        <div class="enjeux">
            <div>
                {#if dossier.enjeu_politique || dossier.enjeu_écologique}
                    {#if dossier.enjeu_politique}
                        <div>
                            <span class="fr-icon-bank-fill" aria-hidden="true"></span>
                            Enjeu politique
                        </div>
                    {/if}
                    {#if dossier.enjeu_écologique}
                        <div>
                            <span class="fr-icon-earth-fill" aria-hidden="true"></span>
                            Enjeu écologique
                        </div>
                    {/if}
                {/if}
            </div>
            <div>
                <button class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-chat-3-line" data-fr-opened="false" aria-controls="fr-modal-1">
                    Commentaire
                </button>
            </div>
        </div>

        {#if dossier.rattaché_au_régime_ae}
            <div>
                <span class="fr-icon-pantone-fill" aria-hidden="true"></span>
                Autorisation environnementale
            </div>
        {/if}

        <!--
        <div>
            <span class="fr-icon-scales-3-fill" aria-hidden="true"></span>
            Contentieux
        </div>
        -->
    </section>
</header>

<dialog aria-labelledby="fr-modal-title-modal-1" id="fr-modal-1" class="fr-modal">
    <div class="fr-container fr-container--fluid fr-container-md">
        <div class="fr-grid-row fr-grid-row--center">
            <div class="fr-col-12 fr-col-md-8 fr-col-lg-8">
                <div class="fr-modal__body">
                    <div class="fr-modal__header">
                        <button class="fr-btn--close fr-btn" title="Fermer la fenêtre modale" aria-controls="fr-modal-1">Fermer</button>
                    </div>
                    <div class="fr-modal__content">
                        <h1 id="fr-modal-title-modal-1" class="fr-modal__title">Commentaire enjeux</h1>
                        <div class="commentaire-enjeux">
                            {dossier.commentaire_enjeu}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</dialog>


<style lang="scss">
    header{
        display: flex;
        flex-direction: row;

        & > :nth-child(1){
            flex: 2
        }
        & > :nth-child(2){
            flex: 1
        }

        section > div {
            margin-bottom: 0.7rem;
        }

        .enjeux{
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
        }

    }

    dialog {
        .commentaire-enjeux{
            white-space: preserve;
        }
    }
</style>
