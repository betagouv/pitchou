<script>
	//@ts-check
	import AutoComplete from "simple-svelte-autocomplete"

    import '../../types.js'

	/** @type {EspèceProtégée[]} */
	export let espèces;
	/** @type {EspèceProtégée | undefined} */
	export let selectedItem = undefined;
	export let onChange = undefined
	export let htmlClass


	/**
	 * 
	 * @param {EspèceProtégée} esp
	 */
	function espèceLabel(esp){
		return `${[...esp.nomsVernaculaires][0]} (${[...esp.nomsScientifiques][0]})`
	}

	/**
	 * 
	 * @param {EspèceProtégée[]} espèces
	 */
	function makeEspèceToLabel(espèces){
		return new Map(espèces.map(e => [e, espèceLabel(e)]))
	}

	$: espèceToLabel = makeEspèceToLabel(espèces)
	
	/**
	 * 
	 * @param {EspèceProtégée[]} espèces
	 */
	function makeEspèceToKeywords(espèces){
		return new Map(espèces.map(e => [e, [...e.nomsVernaculaires, ...e.nomsScientifiques].join(' ')]))
	}

	$: espèceToKeywords = makeEspèceToKeywords(espèces)

	function beforeChange (oldSelectedItem, newSelectedItem) {
		// Difficultés avec onChange https://github.com/pstanoev/simple-svelte-autocomplete/issues/36
		// Donc on utilise beforeChange
		if (onChange) {
			onChange(newSelectedItem)
		}
		return true
	}
</script>

<AutoComplete 
	bind:selectedItem={selectedItem}
	items={espèces}
	labelFunction={e => espèceToLabel.get(e)}
	keywordsFunction={e => espèceToKeywords.get(e)}
	maxItemsToShowInList=20
	cleanUserText=false
	{beforeChange}
	class={htmlClass}
	hideArrow={true}
>
	<div slot="item" let:item>
		{espèceToLabel.get(item)}
	</div>
</AutoComplete>

<style lang="scss">
	:global(.autocomplete-list.hidden){
		display: none;
	}
</style>
