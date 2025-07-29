<script>

    import {formatLocalisation, formatPorteurDeProjet} from '../../affichageDossier.js'
    import {afficherString} from '../../affichageValeurs.js'
    import TagPhase from '../TagPhase.svelte'
    import BoutonModale from '../DSFR/BoutonModale.svelte'
    import {instructeurLaisseDossier, instructeurSuitDossier} from '../../actions/suiviDossier.js';
    
    /** @import {ComponentProps} from 'svelte' */
    /** @import Squelette from '../Squelette.svelte' */

    /** @import {DossierComplet} from '../../../types/API_Pitchou.ts' */
    /** @import {PitchouState} from '../../store.js' */
    /** @import Dossier from '../../../types/database/public/Dossier.ts' */


    /** @type {DossierComplet} */
    export let dossier

    /** @type {NonNullable<ComponentProps<Squelette>['email']>} */
    export let email

    /** @type {PitchouState['relationSuivis']} */
    export let relationSuivis

    let phase = dossier.évènementsPhase[0] && dossier.évènementsPhase[0].phase || 'Accompagnement amont';

    $: dossiersSuiviParInstructeurActuel = relationSuivis && relationSuivis.get(email)
    $: dossierActuelSuiviParInstructeurActuel = dossiersSuiviParInstructeurActuel && dossiersSuiviParInstructeurActuel.has(dossier.id)

    /**
     * 
     * @param {Dossier['id']} id
     */
    function instructeurActuelSuitDossier(id) {
        return instructeurSuitDossier(email, id)
    }

    /**
     * 
     * @param {Dossier['id']} id
     */
    function instructeurActuelLaisseDossier(id) {
        return instructeurLaisseDossier(email, id)
    }

</script>

<header class="fr-mb-2w">
    <section>

        <h1 class="fr-mb-1v">Dossier n°{dossier.id}&nbsp;:&nbsp;{dossier.nom}</h1>
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
        {#if dossier.number_demarches_simplifiées}
            <div>
                <span class="fr-icon-folder-2-fill" aria-hidden="true"></span>
                Numéro dossier Démarches Simplifiées&nbsp:&nbsp{dossier.number_demarches_simplifiées}
            </div>
        {/if}
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
                {#if dossier.commentaire_libre && dossier.commentaire_libre.trim().length >= 1}
                    <BoutonModale id={`dsfr-modale-${dossier.id}`}>
                        <svelte:fragment slot="contenu-bouton">Commentaire</svelte:fragment>

                        <h1 slot="titre-modale" id="fr-modal-title-modal-1" class="fr-modal__title">Commentaire enjeux et procédure</h1>

                        <div class="contenu-modale" slot="contenu-modale">
                            {dossier.commentaire_libre}
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

        {#if typeof dossierActuelSuiviParInstructeurActuel === 'boolean'}

            {#if dossierActuelSuiviParInstructeurActuel}
                <button on:click={() => instructeurActuelLaisseDossier(dossier.id)} class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-star-fill fr-btn--icon-left">Ne plus suivre</button>
            {:else}
                <button on:click={() => instructeurActuelSuitDossier(dossier.id)} class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-star-line fr-btn--icon-left" >Suivre</button>
            {/if}

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
