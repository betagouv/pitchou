<script>
    //@ts-check

    /** @import {DossierComplet} from '../../../types/API_Pitchou.js' */

    
    /**
     * @typedef {Object} Props
     * @property {DossierComplet} dossier
     */

    /** @type {Props} */
    let { dossier } = $props();

    const {number_demarches_simplifiées: numdos} = dossier

</script>

<div class="row">

    <section>
        <h2>Avis experts</h2>

        <p>(bientôt ici...)</p>
    </section>

    <section>
        <a class="fr-btn fr-mr-3w" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}/avis_new`}>
            Demander un avis
        </a>
        <a class="fr-btn" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}/avis`}>
            Voir les avis
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
</style>
