<script>
	//@ts-check
  	import Svelecte from 'svelecte';
	/** @import {EspèceProtégée} from '../../types/especes.d.ts' */

	import {espèceLabel} from '../espèceFieldset.js'

	
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


	function optionFun(item){
		console.log('optionFun item', item)
		const ret = espèceLabel(item);
		console.log('ret', ret)
		return ret

	}

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



{#snippet option(/** @type {any} */ item)}
<div>
  {optionFun(item)}
</div>
{/snippet}

<Svelecte 
	bind:value={selectedItem}
	valueAsObject={true}
	options={espèces}
	labelField="nomsVernaculaires"
	{onChange}
	className={htmlClass}
	{option}
>
</Svelecte>

<style lang="scss">
	:global(.autocomplete-list.hidden){
		display: none;
	}
</style>
