<script>
    import { differenceInMonths, differenceInWeeks, addMonths, format } from 'date-fns';
    import IndicateurDélai from './IndicateurDélai.svelte';
    import {getDébutPhaseActuelle} from '../getDébutPhaseActuelle.js';

    /** @import {DossierRésumé} from '../../types/API_Pitchou.js' */

    /** @type { DossierRésumé } */
    export let dossier;

    $: débutPhaseActuelle = getDébutPhaseActuelle(dossier)
    $: monthDiff = differenceInMonths(new Date(), débutPhaseActuelle.dateDébut)
    //$: console.log('monthDiff', monthDiff)
    // le +1, c'est pour avoir un délai pessimiste
    $: weekDiff = differenceInWeeks(new Date(), addMonths(débutPhaseActuelle.dateDébut, monthDiff)) + 1
    // $: console.log('weekDiff', weekDiff)

    $: quantité = monthDiff + (weekDiff/4)
    $: alt = `depuis ${format(débutPhaseActuelle.dateDébut, 'yyyy-MM-dd')} - ~${monthDiff} mois`


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
