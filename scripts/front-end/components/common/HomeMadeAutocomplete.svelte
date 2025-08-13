<script>
	/** @import {EspèceProtégée} from '../../../types/especes.d.ts' */

    /**
     * faire un <input>
     * - [x] qui liste les trucs pertinents quand on écrit
     * - [ ] mettre la vraie liste des espèces
     *  - [ ] max 12 éléments affichés
     */

    /**
     * @typedef {Object} Props
     * @property {EspèceProtégée[]} espèces
     * @property {EspèceProtégée | undefined} [selectedItem]
     * @property {function | undefined} [onChange]
     * @property {any} htmlClass
     * @property {any} labelFunction
     * @property {any} keywordsFunction
     */

	/** @type {Props} */

    let {espèces} = $props()

    let text = $state('')

    let focus = $state(false);

    let onfocus = () => {focus = true}
    let onblur = () => {focus = false}

    let élémentsPertinents = $derived.by(() => {
        if(!focus)
            return []

        if(text.trim().length === 0)
            return []
        

        return espèces
            .filter(e => [...e.nomsScientifiques, ...e.nomsVernaculaires].join(' ').toLowerCase().includes(text.toLowerCase()))
            .slice(0, 12)
    })

    $inspect('text', text)
    $inspect('élémentsPertinents', élémentsPertinents)

</script>

<div class="autocomplete-container">
    <input bind:value={text} type="search" {onfocus} {onblur} class="fr-input">

    {#if élémentsPertinents.length >= 1}
    <ol>
        {#each élémentsPertinents as el}
            <li>{el}</li>
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
                padding: 0.3rem;
                margin-bottom: 2px;

                background-color: var(--background-contrast-grey);
                cursor: pointer;

                &::marker{
                    content: none;
                }
            }
        }
    }
   

</style>