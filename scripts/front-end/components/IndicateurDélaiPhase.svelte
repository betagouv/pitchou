<script>
    import { differenceInMonths, differenceInWeeks, addMonths, format } from 'date-fns';
    import IndicateurDélai from './IndicateurDélai.svelte';

    /** @import {DossierComplet, DossierPhase} from '../../types/API_Pitchou.js' */
    /** @import {default as ÉvènementPhaseDossier} from '../../types/database/public/ÉvènementPhaseDossier.js' */

    /** @type { DossierComplet & {évènementsPhase: ÉvènementPhaseDossier[]} } */
    export let dossier;

    /**
     * 
     * @param { DossierComplet & {évènementsPhase: ÉvènementPhaseDossier[]} } dossier
     * @returns { {phase: DossierPhase, dateDébut: Date}}
     */
    function getDébutPhaseActuelle(dossier){
        // C'est trop simpliste
        // PPP à revoir à l'occasion de https://trello.com/c/GmhEx16G/420-un-dossier-qui-passe-en-instruction-dans-ds-reste-en-instruction-dans-pitchou
        /** @type {DossierPhase}*/
        const phaseActuelle = dossier.évènementsPhase[0].phase

        let dateDébut;

        if(phaseActuelle === 'Accompagnement amont'){
            const {date_dépôt} = dossier

            dateDébut = date_dépôt
        }
        else{
            dateDébut = dossier.évènementsPhase[0].horodatage
        }


        return { dateDébut, phase: phaseActuelle}
    }


    $: débutPhaseActuelle = getDébutPhaseActuelle(dossier)
    $: monthDiff = differenceInMonths(new Date(), débutPhaseActuelle.dateDébut)
    //$: console.log('monthDiff', monthDiff)
    // le +1, c'est pour avoir un délai pessimiste
    $: weekDiff = differenceInWeeks(new Date(), addMonths(débutPhaseActuelle.dateDébut, monthDiff)) + 1
    // $: console.log('weekDiff', weekDiff)

    $: alt = `depuis ${format(débutPhaseActuelle.dateDébut, 'yyyy-MM-dd')} - ~${monthDiff} mois`

</script>


{#if débutPhaseActuelle.phase === 'Instruction'}
    <IndicateurDélai 
        quantité={monthDiff + (weekDiff/4)}
        style={monthDiff >= 3 ? 'erreur' : (monthDiff >= 2 ? 'avertissement' : 'info') }
        {alt}>
    </IndicateurDélai>
{:else}
    <IndicateurDélai 
        quantité={monthDiff + (weekDiff/4)}
        style='info' 
        {alt}>
    </IndicateurDélai>
{/if}





<style lang="scss">
</style>
