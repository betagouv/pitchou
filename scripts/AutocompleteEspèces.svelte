<script>
	import AutoComplete from "simple-svelte-autocomplete"
	export let espèces;

	$: espèceToLabel = makeEspèceToLabel(espèces)

	function espèceLabel(esp){
		return `${esp["NOM_VERN"]} - <i>${esp["LB_NOM"]}</i>`
	}

	function makeEspèceToLabel(espèces){
		return new Map(espèces.map(e => [e, espèceLabel(e)]))
	}
</script>

<AutoComplete 
	items="{espèces}" 
	labelFunction={e => espèceToLabel.get(e)}
	maxItemsToShowInList=20
	cleanUserText=false
	placeholder="Ex: Fauvette pitchou"
>
	<div slot="item" let:item let:label>
		{@html label}
	</div>
</AutoComplete>

<style lang="scss">
	
</style>
