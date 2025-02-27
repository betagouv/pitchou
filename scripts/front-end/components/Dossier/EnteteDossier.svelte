<script>
    /** @import {DossierComplet} from '../../../types/API_Pitchou' */

    import {formatLocalisation, formatPorteurDeProjet} from '../../affichageDossier.js'
    import {afficherString} from '../../affichageValeurs.js'
    import TagPhase from '../TagPhase.svelte'
    import BoutonModale from '../DSFR/BoutonModale.svelte'

    /** @type {DossierComplet} */
    export let dossier

    let phase = dossier.évènementsPhase[0] && dossier.évènementsPhase[0].phase || 'Accompagnement amont';

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
            {formatPorteurDeProjet(dossier)}
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
                {#if dossier.commentaire_enjeu && dossier.commentaire_enjeu.trim().length >= 1}
                    <BoutonModale id={`dsfr-modale-${dossier.id}`}>
                        <svelte:fragment slot="contenu-bouton">Commentaire</svelte:fragment>

                        <h1 slot="titre-modale" id="fr-modal-title-modal-1" class="fr-modal__title">Commentaire enjeux et procédure</h1>

                        <div class="contenu-modale" slot="contenu-modale">
                            {dossier.commentaire_enjeu}
                        </div>
                    </BoutonModale>
                {/if}
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

    .contenu-modale{
        white-space: preserve;
    }

</style>
