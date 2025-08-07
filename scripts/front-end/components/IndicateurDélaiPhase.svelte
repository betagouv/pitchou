<script>
    import { differenceInMonths, differenceInWeeks, addMonths, format } from 'date-fns';
    import IndicateurDélai from './IndicateurDélai.svelte';
    import {getDébutPhaseActuelle} from '../getDébutPhaseActuelle.js';

    /** @import {DossierRésumé} from '../../types/API_Pitchou.js' */

    
    /**
     * @typedef {Object} Props
     * @property { DossierRésumé } dossier
     */

    /** @type {Props} */
    let { dossier } = $props();

    let débutPhaseActuelle = $derived(getDébutPhaseActuelle(dossier))
    let monthDiff = $derived(differenceInMonths(new Date(), débutPhaseActuelle.dateDébut))
    //$: console.log('monthDiff', monthDiff)
    // le +1, c'est pour avoir un délai pessimiste
    let weekDiff = $derived(differenceInWeeks(new Date(), addMonths(débutPhaseActuelle.dateDébut, monthDiff)) + 1)
    // $: console.log('weekDiff', weekDiff)

    let quantité = $derived(monthDiff + (weekDiff/4))
    let alt = $derived(`depuis ${format(débutPhaseActuelle.dateDébut, 'yyyy-MM-dd')} - ~${monthDiff} mois`)


</script>

{#if débutPhaseActuelle.phase === 'Instruction'}
    <IndicateurDélai 
        {quantité}
        style={quantité >= 3 ? 'erreur' : (quantité >= 2 ? 'avertissement' : 'info') }
        {alt}>
    </IndicateurDélai>
{:else}
    <IndicateurDélai 
        {quantité}
        style='info' 
        {alt}>
    </IndicateurDélai>
{/if}
