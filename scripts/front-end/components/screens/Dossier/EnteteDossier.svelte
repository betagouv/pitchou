<script>
    /** @import {DossierRésumé} from '../../../../types/API_Pitchou' */

    import {formatLocalisation, formatDéposant, phases, prochaineActionAttenduePar} from '../../../affichageDossier.js'
    import {afficherBool, afficherString} from '../../../affichageValeurs.js'
    import TagEnjeu from '../../TagEnjeu.svelte'

    /** @type {DossierRésumé} */
    export let dossier

</script>

<header>
    <h1>{dossier.nom}</h1>
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
    <div>
        <span class="fr-icon-account-pin-circle-fill" aria-hidden="true"></span>
        {afficherString(dossier.prochaine_action_attendue_par)}
    </div>
    <div>
        {#if dossier.enjeu_politique || dossier.enjeu_écologique}
            {#if dossier.enjeu_politique}
                <span class="fr-icon-bank-fill" aria-hidden="true"></span>
                Enjeu politique
            {/if}
            {#if dossier.enjeu_écologique}
                <span class="fr-icon-earth-fill" aria-hidden="true"></span>
                Enjeu écologique
            {/if}
        {/if}
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


</header>

<style lang="scss">

</style>
