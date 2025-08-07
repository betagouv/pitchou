<script>
    //@ts-check
  
	/** @import {EspèceProtégée} from '../../types/especes.d.ts' */

    
    /**
     * @typedef {Object} Props
     * @property {EspèceProtégée} espèce
     */

    /** @type {Props} */
    let { espèce } = $props();

    let [premierNomVernaculaire, ...autresNomsVernaculaires] = [...espèce.nomsVernaculaires]
    let [premierNomScientifique, ...autresNomsScientifiques] = [...espèce.nomsScientifiques]

    /** @type {string | undefined} */
    let title = $state();

    if(autresNomsVernaculaires.length >= 1){
        title = autresNomsVernaculaires.join(', ')

        if(autresNomsScientifiques.length >= 1){
            title += ' | ' + autresNomsScientifiques.join(', ')
        }
    }
    else{
        if(autresNomsScientifiques.length >= 1){
            title = autresNomsScientifiques.join(', ')
        }
    }

</script>

<span {title}>
    {premierNomVernaculaire} (<i>{premierNomScientifique}</i>)
</span>


<style lang="scss">

</style>
