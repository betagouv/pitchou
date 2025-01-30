<script>
    /** @import {DossierComplet} from '../../../../types/API_Pitchou' */

    import {formatLocalisation, formatDéposant} from '../../../affichageDossier.js'
    import {afficherString} from '../../../affichageValeurs.js'
    import TagPhase from '../../TagPhase.svelte'

    /** @type {DossierComplet} */
    export let dossier

    const {number_demarches_simplifiées: numdos} = dossier

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
                <button class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-chat-3-line">
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
            Contentiex
            {dossier.rattaché_au_régime_ae}
        </div>
        -->
    </section>
</header>

<!--
<nav class="dossier-nav fr-mb-4w">
    <ul class="fr-btns-group fr-btns-group--inline fr-btns-group--sm fr-mb-2w">
        <li> 
            <a class="fr-btn fr-btn--secondary fr-my-0" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}`}>Dossier sur Démarches Simplifiées</a>
        </li>
        <li>
            <a class="fr-btn fr-btn--secondary fr-my-0" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}/annotations-privees`}>Annotations privées sur Démarches Simplifiées</a>
        </li>
    </ul>
    <ul class="fr-btns-group fr-btns-group--inline-lg">
        <li>
            <a class="fr-btn fr-btn--secondary fr-my-0" href={`/dossier/${dossier.id}/description`}>Description du dossier</a>
        </li>
        <li>
            <a class="fr-btn fr-btn--secondary fr-my-0" href={`/dossier/${dossier.id}/procedure`}>Procédure</a>
        </li>
        <li>
            <a class="fr-btn fr-btn--secondary fr-my-0" href={`/dossier/${dossier.id}/messagerie`}>Messagerie</a>
        </li>
        <li>
            <a class="fr-btn fr-btn--secondary fr-my-0" href={`/dossier/${dossier.id}/redaction-arrete-prefectoral`}>Rédaction arrêté préféctoral</a>
        </li>
    </ul>
</nav>
-->

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
</style>
