<script>
	import AutoComplete from "simple-svelte-autocomplete"
	export let espèces;
</script>

<h1>Recherche d'une espèce</h1>
<AutoComplete items="{espèces}" labelFunction={e =>
	`${e["NOM_VERN"]} - <i>${e["LB_NOM"]}</i>`
	}>
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

	h2 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}
	
</style>
