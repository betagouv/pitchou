<script>
	//@ts-check

	import AutoComplete from "simple-svelte-autocomplete"
	/** @type {Espèce[]} */
	export let espèces;
	export let selectedItem = undefined;
	export let onChange = undefined
	export let htmlClass

	$: espèceToLabel = makeEspèceToLabel(espèces)

	/**
	 * 
	 * @param {Espèce} esp
	 */
	function espèceLabel(esp){
		return `${esp["NOM_VERN"]} (${esp["LB_NOM"]})`
	}

	/**
	 * 
	 * @param {Espèce[]} espèces
	 */
	function makeEspèceToLabel(espèces){
		return new Map(espèces.map(e => [e, espèceLabel(e)]))
	}

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
	maxItemsToShowInList=20
	cleanUserText=false
	{beforeChange}
	class={htmlClass}
	hideArrow={true}
>
	<div slot="item" let:item>
		{item["NOM_VERN"]} (<i>{item["LB_NOM"]}</i>)
	</div>
</AutoComplete>

<style lang="scss">
	:global(.autocomplete-list.hidden){
		display: none;
	}
</style>
