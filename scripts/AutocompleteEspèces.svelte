<script>
	import AutoComplete from "simple-svelte-autocomplete"
	export let espèces;
	export let selectedItem = undefined;
	export let onChange = undefined

	$: espèceToLabel = makeEspèceToLabel(espèces)

	function espèceLabel(esp){
		return `${esp["NOM_VERN"]} (${esp["LB_NOM"]})`
	}

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
	placeholder="Ex: Fauvette pitchou"
	{beforeChange}
>
	<div slot="item" let:item>
		{item["NOM_VERN"]} (<i>{item["LB_NOM"]}</i>)
	</div>
</AutoComplete>

<style lang="scss">
	
</style>
