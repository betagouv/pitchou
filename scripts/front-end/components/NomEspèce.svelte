<script>
    //@ts-check
    import '../../types.js'

    /** @type {EspèceProtégées} */
    export let espèce

    let [premierNomVernaculaire, ...autresNomsVernaculaires] = [...espèce.nomsVernaculaires]
    let [premierNomScientifique, ...autresNomsScientifiques] = [...espèce.nomsScientifiques]

    /** @type {string | undefined} */
    let title;

    if(autresNomsVernaculaires.length >= 1){
        title = autresNomsVernaculaires.join(', ')

        if(autresNomsScientifiques.length >= 1){
            title = title + ' | ' + autresNomsScientifiques.join(', ')
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
