<script>
    //@ts-check
    import DécisionsAdministratives from './DécisionsAdministratives.svelte'

    import {supprimerDécisionAdministrative} from '../../actions/décisionAdministrative.js'

    /** @import {DossierComplet, FrontEndDécisionAdministrative} from '../../../types/API_Pitchou.ts' */

    /** @type {DossierComplet} */
    export let dossier

    $: décisionsAdministratives = dossier.décisionsAdministratives || []

    /**
     * 
     * @param {FrontEndDécisionAdministrative} décisionAdministrative
     */
    function créerFonctionSupprimer(décisionAdministrative){

        return function(){
            const index = décisionsAdministratives.indexOf(décisionAdministrative);
            if (index !== -1) { 
                décisionsAdministratives.splice(index, 1); 
            }

            décisionsAdministratives = décisionsAdministratives

            return supprimerDécisionAdministrative(décisionAdministrative.id)
        }
    }
</script>

<div class="row">
    <h2>Contrôles</h2>
    <h3>Décisions administratives</h3>

    {#if décisionsAdministratives.length === 0}
        Il n'y a pas de décisions administrative à contrôler concernant ce dossier
    {:else}
        {#each décisionsAdministratives as décisionAdministrative}
            <DécisionsAdministratives 
                {décisionAdministrative} 
                dossierId={dossier.id} 
                supprimerDécisionAdministrative={créerFonctionSupprimer(décisionAdministrative)}
            ></DécisionsAdministratives>
        {/each}
    {/if}
</div>


<style lang="scss">
    
</style>
