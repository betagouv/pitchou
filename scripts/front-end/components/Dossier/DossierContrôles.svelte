<script>
    //@ts-check

    import {formatDateRelative, formatDateAbsolue} from '../../affichageDossier.js'

    /** @import {DossierComplet} from '../../../types/API_Pitchou.ts' */

    /** @type {DossierComplet} */
    export let dossier

    export let décisionsAdministratives = dossier.décisionsAdministratives || []

    console.log('décisionsAdministratives', décisionsAdministratives)

</script>

<div class="row">
    <h2>Contrôles</h2>
    <h3>Décisions administratives</h3>

    {#if décisionsAdministratives.length === 0}
        Il n'y a pas de décisions administrative à contrôler concernant ce dossier
    {:else}
        Ce dossier a {décisionsAdministratives.length} décisions administratives
    {/if}
</div>



<style lang="scss">

</style>
