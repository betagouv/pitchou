<script>
    //@ts-check
    import clsx from 'clsx'

    import DécisionsAdministratives from './Contrôles/DécisionsAdministratives.svelte'
    import FormulaireDécisionAdministrative from './Contrôles/FormulaireDécisionAdministrative.svelte'

    import {sauvegardeNouvelleDécisionAdministrative, supprimerDécisionAdministrative} from '../../actions/décisionAdministrative.js'
    import {refreshDossierComplet} from '../../actions/dossier.js';


    /** @import {DossierComplet, FrontEndDécisionAdministrative} from '../../../types/API_Pitchou.ts' */
    /** @import {DécisionAdministrativePourTransfer} from '../../../types/API_Pitchou.ts' */

    
    /**
     * @typedef {Object} Props
     * @property {DossierComplet} dossier
     */

    /** @type {Props} */
    let { dossier } = $props();

    /** @type {FrontEndDécisionAdministrative[]} */
    let décisionsAdministratives = $derived(dossier.décisionsAdministratives || [])

    //$inspect('dossier', dossier)
    //$inspect('décisionsAdministratives', décisionsAdministratives)

    /**
     * 
     * @param {FrontEndDécisionAdministrative} décisionAdministrative
     */
    function créerFonctionSupprimer(décisionAdministrative){

        return function(){
            const index = décisionsAdministratives.indexOf(décisionAdministrative);
            
            if (index !== undefined && index !== -1) { 
                décisionsAdministratives = décisionsAdministratives.toSpliced(index, 1); 
            }

            refreshDossierComplet(dossier.id)

            return supprimerDécisionAdministrative(décisionAdministrative.id)
        }
    }

    const phase = dossier.évènementsPhase.at(-1)?.phase || 'Accompagnement amont'

    let classes = $derived(clsx([
        'fr-btn', 'fr-btn--icon-left', 'fr-icon-add-line',
        décisionsAdministratives.length >= 1 || phase === 'Accompagnement amont' || phase === 'Étude recevabilité DDEP' ? 'fr-btn--secondary' : undefined
    ]))

    /** @type {DécisionAdministrativePourTransfer | undefined} */
    let décisionAdministrativeEnCréation = $state()

    function commencerCréationDécisionAdministrative(){
        décisionAdministrativeEnCréation = {
            dossier: dossier.id
        }
    }

    function onValider(){
        if(!décisionAdministrativeEnCréation){
            throw new TypeError(`décisionAdministrativeEnCréation est undefined dans DossierContrôles -> onValider`)
        }

        //@ts-ignore
        décisionsAdministratives.push(décisionAdministrativeEnCréation)
        // optimist UI change
        décisionsAdministratives = décisionsAdministratives
        sauvegardeNouvelleDécisionAdministrative(décisionAdministrativeEnCréation) 
        décisionAdministrativeEnCréation = undefined;
    }

    function annulerCréation() {
        décisionAdministrativeEnCréation = undefined
    }
</script>

<div class="row">
    <h2>Décisions administratives</h2>

    {#if décisionsAdministratives.length === 0}
        <p>Il n'y a pas de décisions administrative à contrôler concernant ce dossier</p>
    {:else}
        {#each décisionsAdministratives as décisionAdministrative}
            <DécisionsAdministratives 
                {décisionAdministrative} 
                dossierId={dossier.id} 
                supprimerDécisionAdministrative={créerFonctionSupprimer(décisionAdministrative)}
            ></DécisionsAdministratives>
        {/each}
    {/if}

    {#if décisionAdministrativeEnCréation}
        <FormulaireDécisionAdministrative décisionAdministrative={décisionAdministrativeEnCréation} onValider={onValider}>
            {#snippet boutonValider()}
                <button type="submit" class="fr-btn">Sauvegarder</button>
            {/snippet}
            {#snippet boutonAnnuler()}
                <button type="button" class="fr-btn fr-btn--secondary" onclick={annulerCréation}>Annuler</button>
            {/snippet}
        </FormulaireDécisionAdministrative>
    {:else}
        <button onclick={commencerCréationDécisionAdministrative} class={classes}>Rajouter une décision administrative</button>
    {/if}
</div>


<style lang="scss">
    
</style>
