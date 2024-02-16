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

<h1>Recherche d'une espèce</h1>
<AutoComplete 
	items="{espèces}" 
	labelFunction={e => espèceToLabel.get(e)}
	maxItemsToShowInList=20
	cleanUserText=false
>
	<div slot="item" let:item let:label>
		{@html label}
	</div>
</AutoComplete>

<style lang="scss">
	
	:global(main) {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;

		@media (min-width: 640px) {
			max-width: none;
		}
	}
	
</style>
