<script>
	import AutoComplete from "simple-svelte-autocomplete"
	export let espèces;
	export let selectedItem;

	$: espèceToLabel = makeEspèceToLabel(espèces)

	function espèceLabel(esp){
		return `${esp["NOM_VERN"]} (${esp["LB_NOM"]})`
	}

	function makeEspèceToLabel(espèces){
		return new Map(espèces.map(e => [e, espèceLabel(e)]))
	}
</script>

<AutoComplete 
	selectedItem={selectedItem}
	items={espèces}
	labelFunction={e => espèceToLabel.get(e)}
	maxItemsToShowInList=20
	cleanUserText=false
	placeholder="Ex: Fauvette pitchou"
>
	<div slot="item" let:item>
		{item["NOM_VERN"]} (<i>{item["LB_NOM"]}</i>)
	</div>
</AutoComplete>

<style lang="scss">
	
</style>
