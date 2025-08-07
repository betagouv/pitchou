<script>
    //@ts-check
    import DécisionsAdministratives from './DécisionsAdministratives.svelte'

    /** @import {DossierComplet} from '../../../types/API_Pitchou.ts' */

    

    /**
     * @typedef {Object} Props
     * @property {DossierComplet} dossier
     * @property {any} [décisionsAdministratives]
     */

    /** @type {Props} */
    let { dossier, décisionsAdministratives = dossier.décisionsAdministratives || [] } = $props();
</script>

<div class="row">
    <h2>Contrôles</h2>
    <h3>Décisions administratives</h3>

    {#if décisionsAdministratives.length === 0}
        Il n'y a pas de décisions administrative à contrôler concernant ce dossier
    {:else}
        {#each décisionsAdministratives as décisionAdministrative}
            <DécisionsAdministratives {décisionAdministrative}></DécisionsAdministratives>
        {/each}
    {/if}
</div>


<style lang="scss">
    
</style>
