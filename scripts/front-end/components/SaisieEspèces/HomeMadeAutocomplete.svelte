<script>
	/** @import {EspèceProtégée} from '../../../types/especes' */

    import {normalizeNomEspèce, normalizeTexteEspèce} from '../../../commun/manipulationStrings'

    /**
     * @typedef {Object} Props
     * @property {EspèceProtégée[]} espèces
     * @property {EspèceProtégée | undefined} [espèceSélectionnée]
     * @property {function | undefined} [onChange]
     */


    /**
     * il y a 1000 opportunités d'optimizations en temps 
     * (notamment des memoization). Une autre fois
     */

	/** @type {Props} */

    let {
        espèces,
        onChange,
        espèceSélectionnée = $bindable(undefined)
    } = $props()

    $inspect('espèceSélectionnée', espèceSélectionnée)

    let text = $state(espèceSélectionnée ? espèceLabel(espèceSélectionnée) : '')

    $inspect('text', text)

    let focus = $state(false);

    let onfocus = () => {focus = true}
    let onblur = () => {
        setTimeout(
            () => {focus = false}, 
            500
        )
    }

    let espècesPertinentes = $derived.by(() => {
        if(!focus)
            return []

        if(text.trim().length === 0)
            return []
        

        return espèces
            .filter(({nomsScientifiques, nomsVernaculaires}) => {
                const textParts = text.trim().split(' ').map(normalizeTexteEspèce).filter(x => x.length >= 1)

                return textParts.every((/** @type {string} */ part) => {
                    for(let nom of nomsScientifiques){
                        nom = normalizeNomEspèce(nom)
                        if(nom.includes(part)){
                            return true
                        }
                    }

                    for(let nom of nomsVernaculaires){
                        nom = normalizeNomEspèce(nom)
                        if(nom.includes(part)){
                            return true
                        }
                    }
                })
            })
            .slice(0, 12)
    })

    /**
     * 
     * @param {EspèceProtégée} espèce
     */
    function selectionnerEspèce(espèce){
        if(onChange){
            onChange(espèce)
        }
     
        text = ''
        espèceSélectionnée = espèce
    }

    /**
     * 
     * @param {EspèceProtégée} espèce
     * @returns {string}
     */
    function espèceLabel(espèce){
        return `${[...espèce.nomsVernaculaires][0]} (${[...espèce.nomsScientifiques][0]})`
    }

    //$inspect('text', text)
    //$inspect('espècesPertinentes', espècesPertinentes)

</script>

<div class="autocomplete-container" title={text}>
    <input bind:value={text} {onfocus} {onblur} class="fr-input">

    {#if espècesPertinentes.length >= 1}
    <ol>
        {#each espècesPertinentes as espèce}
            <li><button onclick={() => selectionnerEspèce(espèce)}>
                {espèceLabel(espèce)}
            </button></li>
        {/each}
    </ol>
    {/if}
</div>

<style lang="scss">
    .autocomplete-container{
        position: relative;

        ol{
            position: absolute;
            width: 300%;

            z-index: 1;

            background-color: var(--border-default-grey);
           
            padding-inline-start: 0;

            li{
                width: 100%;

                background-color: var(--background-contrast-grey);

                &::marker{
                    content: none;
                }

                button{
                    width: 100%;
                    height: 100%;
                    padding: 0.3rem;

                    text-align: left;
                }
            }
        }
    }
   

</style>