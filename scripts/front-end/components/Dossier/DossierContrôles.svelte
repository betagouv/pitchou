<script>
    //@ts-check

    import {formatDateAbsolue} from '../../affichageDossier.js'

    /** @import {DossierComplet} from '../../../types/API_Pitchou.ts' */

    /** @type {DossierComplet} */
    export let dossier

    export let décisionsAdministratives = dossier.décisionsAdministratives || []

    const NON_RENSEIGNÉ = '(non renseigné)'

</script>

<div class="row">
    <h2>Contrôles</h2>
    <h3>Décisions administratives</h3>

    {#if décisionsAdministratives.length === 0}
        Il n'y a pas de décisions administrative à contrôler concernant ce dossier
    {:else}
        {#each décisionsAdministratives as {numéro, type, date_signature, date_fin_obligations, fichier_url}}
            <div class="décision-administrative">
                <h4>{type || 'Décision de type inconnu'} {numéro || ''} du {formatDateAbsolue(date_signature)}</h4>
                <div class="fr-mb-1w">Date de fin des obligations : {date_fin_obligations ? formatDateAbsolue(date_fin_obligations) : NON_RENSEIGNÉ}</div>
                <div>Fichier de l'arrêté : 
                    {#if fichier_url}
                        <a class="fr-btn" href={fichier_url}>
                            Télécharger
                        </a>
                    {:else}
                        (pas de fichier pour le moment)
                    {/if}
                </div>
            </div>
        {/each}
    {/if}
</div>



<style lang="scss">
    .décision-administrative{
        margin-bottom: 3rem;
    }
</style>
