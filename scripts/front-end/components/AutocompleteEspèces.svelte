<script>
	//@ts-check
	import AutoComplete from "simple-svelte-autocomplete"

	/** @import {EspèceProtégée} from '../../types/especes.d.ts' */

	
	
	
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
	let {
		espèces,
		selectedItem = $bindable(undefined),
		onChange = undefined,
		htmlClass,
		labelFunction,
		keywordsFunction
	} = $props();

	/**
	 * 
	 * @param {EspèceProtégée} _
	 * @param {EspèceProtégée} newSelectedItem
	 */
	function beforeChange (_, newSelectedItem) {
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
