<script>
    //@ts-check
    import clsx from 'clsx'

    import DécisionsAdministratives from './Contrôles/DécisionsAdministratives.svelte'
    import FormulaireDécisionAdministrative from './Contrôles/FormulaireDécisionAdministrative.svelte'

    import {supprimerDécisionAdministrative, créerModifierDécisionAdministrative} from '../../actions/décisionAdministrative.js'
    import {refreshDossierComplet} from '../../actions/dossier.js'


    /** @import {DossierComplet, FrontEndDécisionAdministrative} from '../../../types/API_Pitchou.ts' */
    /** @import {DécisionAdministrativePourTransfer} from '../../../types/API_Pitchou.ts' */

    /** @type {DossierComplet} */
    export let dossier

    /** @type {FrontEndDécisionAdministrative[]} */
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

    const phase = dossier.évènementsPhase.at(-1)?.phase || 'Accompagnement amont'

    const classes = clsx([
        'fr-btn', 'fr-btn--icon-left', 'fr-icon-add-line',
        phase === 'Accompagnement amont' || phase === 'Étude recevabilité DDEP' ? 'fr-btn--secondary' : undefined
    ])

    /** @type {DécisionAdministrativePourTransfer | undefined} */
    let décisionAdministrativeEnCréation

    function commencerCréationDécisionAdministrative(){
        décisionAdministrativeEnCréation = {
            dossier: dossier.id
        }
    }

    function sauvegarderDécisionAdministrative(){
        if(!décisionAdministrativeEnCréation){
            throw new TypeError(`décisionAdministrativeEnCréation est undefined dans sauvegarderDécisionAdministrative`)
        }
        
        //@ts-ignore
        décisionsAdministratives.push(décisionAdministrativeEnCréation)
        créerModifierDécisionAdministrative(décisionAdministrativeEnCréation)
        décisionAdministrativeEnCréation = undefined;
        refreshDossierComplet(dossier.id)
    }

    function annulerCréation() {
        décisionAdministrativeEnCréation = undefined
    }
</script>

<div class="row">
    <h2>Contrôles</h2>
    <h3>Décisions administratives</h3>

    {#if décisionsAdministratives.length === 0}
        <p>Il n'y a pas de décisions administrative à contrôler concernant ce dossier</p>
        
        {#if décisionAdministrativeEnCréation}
            <FormulaireDécisionAdministrative décisionAdministrative={décisionAdministrativeEnCréation} onValider={sauvegarderDécisionAdministrative}>
                <button slot="bouton-valider" type="submit" class="fr-btn" >Sauvegarder</button>
                <button slot="bouton-annuler" type="button" class="fr-btn fr-btn--secondary" on:click={annulerCréation}>Annuler</button>
            </FormulaireDécisionAdministrative>
        {:else}
            <button on:click={commencerCréationDécisionAdministrative} class={classes}>Rajouter une décision administrative</button>
        {/if}

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
