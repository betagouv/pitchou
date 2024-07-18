<script>
	//@ts-check
	import AutoComplete from "simple-svelte-autocomplete"

    import '../../../../types.js'

	/** @type {EspèceProtégée[]} */
	export let espèces;
	/** @type {EspèceProtégée | undefined} */
	export let selectedItem = undefined;
	export let onChange = undefined
	export let htmlClass
	export let labelFunction
	export let keywordsFunction

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
	{labelFunction}
	{keywordsFunction}
	maxItemsToShowInList=12
	cleanUserText=false
	{beforeChange}
	class={htmlClass}
	hideArrow={true}
	ignoreAccents={false}
>
</AutoComplete>

<style lang="scss">
	:global(.autocomplete-list.hidden){
		display: none;
	}
</style>
