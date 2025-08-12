<script>
	// based on https://github.com/pstanoev/simple-svelte-autocomplete
    // https://github.com/eikaramba/simple-svelte-autocomplete
    // and https://pastebin.com/jeYaWzCx

	/*
   * Simple example with snippet

    <AutoComplete
      bind:selectedItem={selectedBare}
      bind:text={bareText}
      searchFunction={searchActivityContacts}
      delay="200"
      html5autocomplete={false}
      autocompleteOffValue="none"
      className="w-full"
      inputClassName="!font-medium !h-9 placeholder:font-normal disabled:cursor-not-allowed disabled:opacity-50 focus:border-blue-500 focus:ring-blue-500 bg-gray-50 text-indigo-600 border-gray-300 rounded"
      showClear={true}
      hideArrow={true}
      minCharactersToSearch="2"
      maxItemsToShowInList="10"
      noResultsText="Sin resultados"
      moreItemsText="contactos más"
      title="Comienza a escribir el nombre, apellido, celular, o extra"
      labelFunction={(select) => '🗂 ' + select.firstName + (select.lastName ? ' ' + select.lastName : '')}
      valueFieldName="_id"
      keywordsFunction={(select) =>
        select.firstName + ' ' + select.lastName + ' ' + select.phone + ' ' + select.extra}
      placeholder="Nombre, apellido, celular, o extra..."
    >
      {#snippet itemSlot({ item, label })}
        <div>
          {@html label}
        </div>
      {/snippet}
    </AutoComplete>

   */
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';

	const uniqueId = 'sautocomplete-' + Math.floor(Math.random() * 1000);

	// HTML elements
	let input = $state();
	let list = $state();
	let inputContainer = $state();

	// UI state
	let opened = $state(false);
	let loading = $state(false);
	let highlightIndex = $state(-1);
	/**
	 * @typedef {Object} Props
	 * @property {any} [items] - the list of items  the user can select from
	 * @property {boolean|function} [searchFunction] - function to use to get all items (alternative to providing items)
	 * @property {any} [labelFieldName] - field of each item that's used for the labels in the list
	 * @property {any} [keywordsFieldName]
	 * @property {any} [valueFieldName]
	 * @property {any} [labelFunction]
	 * @property {any} [keywordsFunction]
	 * @property {any} [valueFunction]
	 * @property {any} [keywordsCleanFunction]
	 * @property {any} [textCleanFunction]
	 * @property {any} [beforeChange] - events
	 * @property {any} [onChange]
	 * @property {any} [onFocus]
	 * @property {any} [onBlur]
	 * @property {any} [onCreate]
	 * @property {boolean} [selectFirstIfEmpty] - Behaviour properties
	 * @property {number} [minCharactersToSearch]
	 * @property {number} [maxItemsToShowInList]
	 * @property {boolean} [multiple]
	 * @property {boolean} [create]
	 * @property {boolean} [ignoreAccents] - ignores the accents when matching items
	 * @property {boolean} [matchAllKeywords] - all the input keywords should be matched in the item keywords
	 * @property {boolean} [sortByMatchedKeywords] - sorts the items by the number of matchink keywords
	 * @property {any} [itemFilterFunction] - allow users to use a custom item filter function
	 * @property {any} [itemSortFunction] - allow users to use a custom item sort function
	 * @property {boolean} [lock] - do not allow re-selection after initial selection
	 * @property {number} [delay] - delay to wait after a keypress to search for new items
	 * @property {boolean} [localFiltering] - true to perform local filtering of items, even if searchFunction is provided
	 * @property {boolean} [localSorting] - true to perform local sortying of items
	 * @property {boolean} [cleanUserText] - true to clean the user entered text (removes spaces)
	 * @property {boolean} [lowercaseKeywords] - true to lowercase the keywords derived from each item (lowercase)
	 * @property {boolean} [closeOnBlur] - true to close the dropdown when the component loses focus
	 * @property {boolean} [orderableSelection] - true to allow selection reordering by drag and drop, needs multiple to true
	 * @property {boolean} [hideArrow] - option to hide the dropdown arrow
	 * @property {boolean} [showClear] - option to show clear selection button
	 * @property {string} [clearText] - text to use for clear
	 * @property {boolean} [showLoadingIndicator] - option to show loading indicator when the async function is executed
	 * @property {string} [noResultsText] - text displayed when no items match the input text
	 * @property {string} [loadingText] - text displayed when async data is being loaded
	 * @property {string} [moreItemsText] - text displayed when the user text matches a lot of items and we can not display them all in the dropdown
	 * @property {string} [createText] - text displayed when async data is being loaded
	 * @property {any} [placeholder] - the text displayed when no option is selected
	 * @property {any} [className] - apply a className to the control
	 * @property {any} [inputClassName] - apply a className to the input control
	 * @property {any} [inputId] - apply a id to the input control
	 * @property {any} [name] - generate an HTML input with this name
	 * @property {any} [selectName] - generate a <select> tag that holds the value
	 * @property {any} [selectId] - apply a id to the <select>
	 * @property {any} [title] - add the title to the HTML input
	 * @property {any} [html5autocomplete] - enable the html5 autocompletion to the HTML input
	 * @property {string} [autocompleteOffValue] - enable the html5 autocompletion value
	 * @property {any} [readonly] - make the input readonly
	 * @property {any} [dropdownClassName] - apply a className to the dropdown div
	 * @property {boolean} [disabled] - adds the disabled tag to the HTML input
	 * @property {boolean} [noInputStyles] - remove the autocomplete-input class of the input
	 * @property {any} [required] - adds the required attribute to the HTML input
	 * @property {boolean} [debug]
	 * @property {number} [tabindex] - set standard to 0: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex
	 * @property {any} [selectedItem] - selected item state
	 * @property {any} [value]
	 * @property {any} [highlightedItem]
	 * @property {any} [text]
	 */

	/** @type {Props & { [key: string]: any }} */
	let {
		items = $bindable([]),
		searchFunction = false,
		labelFieldName = undefined,
		keywordsFieldName = labelFieldName,
		valueFieldName = undefined,
		labelFunction = function (item) {
			if (item === undefined || item === null) {
				return '';
			}
			return labelFieldName ? item[labelFieldName] : item;
		},
		keywordsFunction = function (item) {
			if (item === undefined || item === null) {
				return '';
			}
			return keywordsFieldName ? item[keywordsFieldName] : labelFunction(item);
		},
		valueFunction = function (item, forceSingle = false) {
			if (item === undefined || item === null) {
				return item;
			}
			if (!multiple || forceSingle) {
				return valueFieldName ? item[valueFieldName] : item;
			} else {
				return item.map((i) => (valueFieldName ? i[valueFieldName] : i));
			}
		},
		keywordsCleanFunction = function (keywords) {
			return keywords;
		},
		textCleanFunction = function (userEnteredText) {
			return userEnteredText;
		},
		beforeChange = function (oldSelectedItem, newSelectedItem) {
			return true;
		},
		onChange = function (newSelectedItem) {},
		onFocus = function () {},
		onBlur = function () {},
		onCreate = function (text) {
			if (debug) {
				console.log('onCreate: ' + text);
			}
		},
		selectFirstIfEmpty = false,
		minCharactersToSearch = 1,
		maxItemsToShowInList = 0,
		multiple = false,
		create = false,
		ignoreAccents = true,
		matchAllKeywords = true,
		sortByMatchedKeywords = false,
		itemFilterFunction = undefined,
		itemSortFunction = undefined,
		lock = false,
		delay = 0,
		localFiltering = true,
		localSorting = true,
		cleanUserText = true,
		lowercaseKeywords = true,
		closeOnBlur = false,
		orderableSelection = false,
		hideArrow = false,
		showClear = false,
		clearText = '&#10006;',
		showLoadingIndicator = false,
		noResultsText = 'No results found',
		loadingText = 'Loading results...',
		moreItemsText = 'items not shown',
		createText = 'Not found, add anyway?',
		placeholder = undefined,
		className = undefined,
		inputClassName = undefined,
		inputId = 'randominputid-' + Math.floor(Math.random() * 1000),
		name = undefined,
		selectName = undefined,
		selectId = 'randomselectid-' + Math.floor(Math.random() * 1000),
		title = undefined,
		html5autocomplete = undefined,
		autocompleteOffValue = 'off',
		readonly = undefined,
		dropdownClassName = undefined,
		disabled = false,
		noInputStyles = false,
		required = null,
		debug = false,
		tabindex = 0,
		selectedItem = $bindable(multiple ? [] : undefined),
		value = $bindable(undefined),
		text = $bindable(undefined),
		onClear = () => {},

		// Snippets
		tagSlot = undefined,
		dropdownHeaderSlot = undefined,
		itemSlot = undefined,
		dropdownFooterSlot = undefined,
		loadingSlot = undefined,
		createSlot = undefined,
		noResultsSlot = undefined,

		...rest
	} = $props();

	let filteredTextLength = $state(0);

	// view model
	let filteredListItems = $state();
	let listItems = [];

	// requests/responses counters
	let lastRequestId = 0;
	let lastResponseId = 0;

	// other state
	let inputDelayTimeout;

	let setPositionOnNextUpdate = $state(false);

	// --- Lifecycle events ---

	$effect(() => {
		if (setPositionOnNextUpdate) {
			setScrollAwareListPosition();
		}
		setPositionOnNextUpdate = false;
	});

	// --- Functions ---

	function safeFunction(theFunction, argument) {
		if (typeof theFunction !== 'function') {
			console.error('Not a function: ' + theFunction + ', argument: ' + argument);
			return undefined;
		}
		let result;
		try {
			result = theFunction(argument);
		} catch (error) {
			console.warn(
				'Error executing Autocomplete function on value: ' + argument + ' function: ' + theFunction
			);
		}
		return result;
	}

	function safeStringFunction(theFunction, argument) {
		let result = safeFunction(theFunction, argument);
		if (result === undefined || result === null) {
			result = '';
		}
		if (typeof result !== 'string') {
			result = result.toString();
		}
		return result;
	}

	function safeLabelFunction(item) {
		// console.log('labelFunction: ' + labelFunction);
		// console.log('safeLabelFunction, item: ' + item);
		return safeStringFunction(labelFunction, item);
	}

	function safeKeywordsFunction(item) {
		// console.log("safeKeywordsFunction");
		const keywords = safeStringFunction(keywordsFunction, item);
		let result = safeStringFunction(keywordsCleanFunction, keywords);
		result = lowercaseKeywords ? result.toLowerCase().trim() : result;
		if (ignoreAccents) {
			result = removeAccents(result);
		}

		if (debug) {
			console.log("Extracted keywords: '" + result + "' from item: " + JSON.stringify(item));
		}
		return result;
	}

	function prepareListItems() {
		let timerId;
		if (debug) {
			timerId = `Autocomplete prepare list ${inputId ? `(id: ${inputId})` : ''}`;
			console.time(timerId);
			console.log('Prepare items to search');
			console.log('items: ' + JSON.stringify(items));
		}

		if (!Array.isArray(items)) {
			console.warn('Autocomplete items / search function did not return array but', items);
			items = [];
		}

		const length = items ? items.length : 0;
		listItems = new Array(length);

		if (length > 0) {
			items.forEach((item, i) => {
				const listItem = getListItem(item);
				if (listItem === undefined) {
					console.log('Undefined item for: ', item);
				}
				listItems[i] = listItem;
			});
		}
		filteredListItems = listItems;

		if (debug) {
			console.log(listItems.length + ' items to search');
			console.timeEnd(timerId);
		}
	}

	function getListItem(item) {
		return {
			// keywords representation of the item
			keywords: localFiltering ? safeKeywordsFunction(item) : [],
			// item label
			label: safeLabelFunction(item),
			// store reference to the origial item
			item: item
		};
	}

	function onSelectedItemChanged() {
		value = valueFunction(selectedItem);
		if (selectedItem && !multiple) {
			text = safeLabelFunction(selectedItem);
		}

		filteredListItems = listItems;
		onChange(selectedItem);
	}

	// -- Reactivity --
	$effect(() => {
		if (!searchFunction && items) {
			prepareListItems();
		}
	});

	// Watch selectedItem changes
	$effect(() => {
		if (selectedItem) onSelectedItemChanged();
	});

	const highlightedItem = $derived(
		filteredListItems &&
			highlightIndex &&
			highlightIndex >= 0 &&
			highlightIndex < filteredListItems.length
			? filteredListItems[highlightIndex].item
			: null
	);

	let showList = $derived(opened && ((items && items.length > 0) || filteredTextLength > 0));

	let hasSelection = $derived(
		(multiple && selectedItem && selectedItem.length > 0) || (!multiple && selectedItem)
	);

	let clearable = $derived(showClear || ((lock || multiple) && hasSelection));

	let locked = $derived(lock && hasSelection);

	function prepareUserEnteredText(userEnteredText) {
		if (userEnteredText === undefined || userEnteredText === null) {
			return '';
		}

		if (!cleanUserText) {
			return userEnteredText;
		}

		const textFiltered = userEnteredText.replace(/[&/\\#,+()$~%.'":*?<>{}]/g, ' ').trim();

		const cleanUserEnteredText = safeStringFunction(textCleanFunction, textFiltered);
		const textTrimmed = lowercaseKeywords
			? cleanUserEnteredText.toLowerCase().trim()
			: cleanUserEnteredText.trim();

		return textTrimmed;
	}

	function numberOfMatches(listItem, searchWords) {
		if (!listItem) {
			return 0;
		}

		const itemKeywords = listItem.keywords;

		let matches = 0;
		searchWords.forEach((searchWord) => {
			if (itemKeywords.includes(searchWord)) {
				matches++;
			}
		});

		return matches;
	}

	async function search() {
		let timerId;
		if (debug) {
			timerId = `Autocomplete search ${inputId ? `(id: ${inputId})` : ''}`;
			console.time(timerId);
			console.log("Searching user entered text: '" + text + "'");
		}

		let textFiltered = prepareUserEnteredText(text);
		if (minCharactersToSearch > 1 && textFiltered.length < minCharactersToSearch) {
			textFiltered = '';
		}
		filteredTextLength = textFiltered.length;

		if (debug) {
			console.log("Changed user entered text '" + text + "' into '" + textFiltered + "'");
		}

		// if no search text load all items
		if (textFiltered === '') {
			if (searchFunction) {
				// we will need to rerun the search
				items = [];
				if (debug) {
					console.log('User entered text is empty clear list of items');
				}
			} else {
				filteredListItems = listItems;
				if (debug) {
					console.log('User entered text is empty set the list of items to all items');
				}
			}
			if (closeIfMinCharsToSearchReached()) {
				if (debug) {
					console.timeEnd(timerId);
				}
				return;
			}
		}

		if (!searchFunction) {
			// internal search
			processListItems(textFiltered);
		} else {
			// external search which provides items
			lastRequestId = lastRequestId + 1;
			const currentRequestId = lastRequestId;
			loading = true;

			// searchFunction is a generator
			if (searchFunction.constructor.name === 'AsyncGeneratorFunction') {
				for await (const chunk of searchFunction(textFiltered, maxItemsToShowInList)) {
					// a chunk of an old response: throw it away
					if (currentRequestId < lastResponseId) {
						return false;
					}

					// a chunk for a new response: reset the item list
					if (currentRequestId > lastResponseId) {
						items = [];
					}

					lastResponseId = currentRequestId;
					items = [...items, ...chunk];
					processListItems(textFiltered);
				}

				// there was nothing in the chunk
				if (lastResponseId < currentRequestId) {
					lastResponseId = currentRequestId;
					items = [];
					processListItems(textFiltered);
				}
			}

			// searchFunction is a regular function
			else {
				let result = await searchFunction(textFiltered, maxItemsToShowInList);

				// If a response to a newer request has been received
				// while responses to this request were being loaded,
				// then we can just throw away this outdated results.
				if (currentRequestId < lastResponseId) {
					return false;
				}

				lastResponseId = currentRequestId;
				items = result;
				processListItems(textFiltered);
			}

			loading = false;
		}

		if (debug) {
			console.timeEnd(timerId);
			console.log('Search found ' + filteredListItems.length + ' items');
		}
	}

	function defaultItemFilterFunction(listItem, searchWords) {
		const matches = numberOfMatches(listItem, searchWords);
		if (matchAllKeywords) {
			return matches >= searchWords.length;
		} else {
			return matches > 0;
		}
	}

	function defaultItemSortFunction(obj1, obj2, searchWords) {
		return numberOfMatches(obj2, searchWords) - numberOfMatches(obj1, searchWords);
	}

	function processListItems(textFiltered) {
		// cleans, filters, orders, and highlights the list items
		prepareListItems();

		const textFilteredWithoutAccents = ignoreAccents ? removeAccents(textFiltered) : textFiltered;
		const searchWords = textFilteredWithoutAccents.split(/\s+/g).filter((word) => word !== '');

		// local search
		let tempfilteredListItems;
		if (localFiltering) {
			if (itemFilterFunction) {
				tempfilteredListItems = listItems.filter((item) =>
					itemFilterFunction(item.item, searchWords)
				);
			} else {
				tempfilteredListItems = listItems.filter((item) =>
					defaultItemFilterFunction(item, searchWords)
				);
			}

			if (localSorting) {
				if (itemSortFunction) {
					tempfilteredListItems = tempfilteredListItems.sort((item1, item2) =>
						itemSortFunction(item1.item, item2.item, searchWords)
					);
				} else {
					if (sortByMatchedKeywords) {
						tempfilteredListItems = tempfilteredListItems.sort((item1, item2) =>
							defaultItemSortFunction(item1, item2, searchWords)
						);
					}
				}
			}
		} else {
			tempfilteredListItems = listItems;
		}

		const hlfilter = highlightFilter(searchWords, 'label');
		filteredListItems = tempfilteredListItems.map(hlfilter);
		closeIfMinCharsToSearchReached();
		return true;
	}

	// $: text, search();

	function afterCreate(createdItem) {
		let listItem;
		if (debug) {
			console.log('createdItem', createdItem);
		}
		if ('undefined' !== typeof createdItem) {
			prepareListItems();
			filteredListItems = listItems;
			let index = findItemIndex(createdItem, filteredListItems);

			// if the items array was not updated, add the created item manually
			if (index <= 0) {
				items = [createdItem];
				prepareListItems();
				filteredListItems = listItems;
				index = 0;
			}

			if (index >= 0) {
				highlightIndex = index;
				listItem = filteredListItems[highlightIndex];
			}
		}
		return listItem;
	}

	function selectListItem(listItem) {
		if (debug) {
			console.log('selectListItem', listItem);
		}
		if ('undefined' === typeof listItem && create) {
			// allow undefined items if create is enabled
			const createdItem = onCreate(text);
			if ('undefined' !== typeof createdItem) {
				if (typeof createdItem.then === 'function') {
					createdItem.then((newItem) => {
						if ('undefined' !== typeof newItem) {
							const newListItem = afterCreate(newItem);
							if ('undefined' !== typeof newListItem) {
								selectListItem(newListItem);
							}
						}
					});
					return true;
				} else {
					listItem = afterCreate(createdItem);
				}
			}
		}

		if ('undefined' === typeof listItem) {
			if (debug) {
				console.log(`listItem is undefined. Can not select.`);
			}
			return false;
		}

		if (locked) {
			return true;
		}

		const newSelectedItem = listItem.item;
		if (beforeChange(selectedItem, newSelectedItem)) {
			// simple selection
			if (!multiple) {
				selectedItem = undefined; // triggers change even if the the same item is selected
				selectedItem = newSelectedItem;
			}
			// first selection of multiple ones
			else if (!selectedItem.length) {
				selectedItem = [newSelectedItem];
			}
			// selecting something already selected => unselect it
			else if (
				JSON.stringify($state.snapshot(selectedItem)).includes(
					JSON.stringify($state.snapshot(newSelectedItem))
				)
			) {
				selectedItem = selectedItem.filter(
					(i) =>
						JSON.stringify($state.snapshot(i)) !== JSON.stringify($state.snapshot(newSelectedItem))
				);
			}
			// adds the element to the selection
			else {
				selectedItem = [...selectedItem, newSelectedItem];
			}
		}
		return true;
	}

	function selectItem() {
		if (debug) {
			console.log('selectItem', highlightIndex);
		}
		const listItem = filteredListItems[highlightIndex];
		if (selectListItem(listItem)) {
			if (debug) {
				console.log('selectListItem true, closing');
			}
			close();
			if (multiple) {
				text = '';
				input.focus();
			}
		} else {
			if (debug) {
				console.log('selectListItem false, not closing');
			}
		}
	}

	function up() {
		if (debug) {
			console.log('up');
		}

		open();
		if (highlightIndex > 0) {
			highlightIndex--;
		}

		highlight();
	}

	function down() {
		if (debug) {
			console.log('down');
		}

		open();
		if (highlightIndex < filteredListItems.length - 1) {
			highlightIndex++;
		}

		highlight();
	}

	function highlight() {
		if (debug) {
			console.log('highlight');
		}

		const query = '.selected';
		if (debug) {
			console.log('Seaching DOM element: ' + query + ' in ' + list);
		}

		/**
		 * @param {Element} el
		 */
		const el = list && list.querySelector(query);
		if (el) {
			if (typeof el.scrollIntoViewIfNeeded === 'function') {
				if (debug) {
					console.log('Scrolling selected item into view');
				}
				el.scrollIntoViewIfNeeded();
			} else if (el.scrollIntoView === 'function') {
				if (debug) {
					console.log('Scrolling selected item into view');
				}
				el.scrollIntoView();
			} else {
				if (debug) {
					console.warn(
						'Could not scroll selected item into view, scrollIntoViewIfNeeded not supported'
					);
				}
			}
		} else {
			if (debug) {
				console.warn('Selected item not found to scroll into view');
			}
		}
	}

	function onListItemClick(listItem) {
		if (debug) {
			console.log('onListItemClick');
		}

		if (selectListItem(listItem)) {
			close();
			if (multiple) {
				text = '';
				input.focus();
			}
		}
	}

	function onDocumentClick(e) {
		if (debug) {
			console.log('onDocumentClick');
		}
		if (e.composedPath().some((path) => path.classList && path.classList.contains(uniqueId))) {
			if (debug) {
				console.log('onDocumentClick inside');
			}
			// resetListToAllItemsAndOpen();
			highlight();
		} else {
			if (debug) {
				console.log('onDocumentClick outside');
			}
			close();
		}
	}

	function onKeyDown(e) {
		if (debug) {
			console.log('onKeyDown');
		}

		let key = e.key;
		if (key === 'Tab' && e.shiftKey) key = 'ShiftTab';
		const fnmap = {
			Tab: opened ? close : null,
			ShiftTab: opened ? close : null,
			ArrowDown: down.bind(this),
			ArrowUp: up.bind(this),
			Escape: onEsc.bind(this),
			Backspace: multiple && hasSelection && !text ? onBackspace.bind(this) : null
		};
		const fn = fnmap[key];
		if (typeof fn === 'function') {
			fn(e);
		}
	}

	function onKeyPress(e) {
		if (debug) {
			console.log('onKeyPress');
		}

		if (e.key === 'Enter') {
			onEnter(e);
		}
	}

	function onEnter(e) {
		if (opened) {
			e.preventDefault();
			selectItem();
		}
	}

	function onInput(e) {
		if (debug) {
			console.log('onInput');
		}

		text = e.target.value;
		if (inputDelayTimeout) {
			clearTimeout(inputDelayTimeout);
		}

		if (delay) {
			inputDelayTimeout = setTimeout(processInput, delay);
		} else {
			processInput();
		}
	}

	function unselectItem(tag) {
		if (debug) {
			console.log('unselectItem', tag);
		}
		selectedItem = selectedItem.filter((i) => i !== tag);
		input.focus();
	}

	function processInput() {
		if (search()) {
			highlightIndex = 0;
			open();
		}
	}

	function onInputClick() {
		if (debug) {
			console.log('onInputClick');
		}
		resetListToAllItemsAndOpen();
	}

	function onEsc(e) {
		if (debug) {
			console.log('onEsc');
		}

		//if (text) return clear();
		e.stopPropagation();
		if (opened) {
			input.focus();
			close();
		}
	}

	function onBackspace(e) {
		if (debug) {
			console.log('onBackspace');
		}

		unselectItem(selectedItem[selectedItem.length - 1]);
	}

	function onFocusInternal() {
		if (debug) {
			console.log('onFocus');
		}

		onFocus();

		resetListToAllItemsAndOpen();
	}

	function onBlurInternal() {
		if (debug) {
			console.log('onBlur');
		}

		if (closeOnBlur) {
			close();
		}

		onBlur();
	}

	function resetListToAllItemsAndOpen() {
		if (debug) {
			console.log('resetListToAllItemsAndOpen');
		}

		if (searchFunction && !listItems.length) {
			search();
		} else if (!text) {
			filteredListItems = listItems;
		}

		open();

		// find selected item
		if (selectedItem) {
			if (debug) {
				console.log('Searching currently selected item: ' + JSON.stringify(selectedItem));
			}

			const index = findItemIndex(selectedItem, filteredListItems);
			if (index >= 0) {
				highlightIndex = index;
				highlight();
			}
		}
	}

	function findItemIndex(item, items) {
		if (debug) {
			console.log('Finding index for item', $state.snapshot(item));
		}

		const cleanItems = $state.snapshot(items);
		let index = -1;
		for (let i = 0; i < cleanItems.length; i++) {
			const listItem = cleanItems[i];
			if ('undefined' === typeof listItem) {
				if (debug) {
					console.log(`listItem ${i} is undefined. Skipping.`);
				}
				continue;
			}
			if (debug) {
				console.log('Item ' + i + ': ' + JSON.stringify(listItem));
			}
			if ($state.snapshot(item) === listItem.item) {
				index = i;
				break;
			}
		}

		if (debug) {
			if (index >= 0) {
				console.log('Found index for item: ' + index);
			} else {
				console.warn('Not found index for item: ' + JSON.stringify($state.snapshot(item)));
			}
		}
		return index;
	}

	function open() {
		if (debug) {
			console.log('open');
		}

		// check if the search text has more than the min chars required
		if (locked || notEnoughSearchText()) {
			return;
		}

		setPositionOnNextUpdate = true;

		opened = true;
	}

	function close() {
		if (debug) {
			console.log('close');
		}
		opened = false;
		loading = false;

		if (!text && selectFirstIfEmpty) {
			highlightIndex = 0;
			selectItem();
		}
	}

	function notEnoughSearchText() {
		return (
			minCharactersToSearch > 0 &&
			filteredTextLength < minCharactersToSearch &&
			// When no searchFunction is defined, the menu should always open when the input is focused
			(searchFunction || filteredTextLength > 0)
		);
	}

	function closeIfMinCharsToSearchReached() {
		if (notEnoughSearchText()) {
			close();
			return true;
		}
		return false;
	}

	function clear() {
		if (debug) {
			console.log('clear');
		}

		text = '';
		selectedItem = multiple ? [] : undefined;
		onClear();

		setTimeout(() => {
			input.focus();
		}, 500);
	}

	export function highlightFilter(keywords, field) {
		return (item) => {
			let label = item[field];

			const newItem = Object.assign({ highlighted: undefined }, item);
			newItem.highlighted = label;

			const labelLowercase = label.toLowerCase();
			const labelLowercaseNoAc = ignoreAccents ? removeAccents(labelLowercase) : labelLowercase;

			if (keywords && keywords.length) {
				const positions = [];

				for (let i = 0; i < keywords.length; i++) {
					let keyword = keywords[i];
					if (ignoreAccents) {
						keyword = removeAccents(keyword);
					}
					const keywordLen = keyword.length;

					let pos1 = 0;
					do {
						pos1 = labelLowercaseNoAc.indexOf(keyword, pos1);
						if (pos1 >= 0) {
							let pos2 = pos1 + keywordLen;
							positions.push([pos1, pos2]);
							pos1 = pos2;
						}
					} while (pos1 !== -1);
				}

				if (positions.length > 0) {
					const keywordPatterns = new Set();
					for (let i = 0; i < positions.length; i++) {
						const pair = positions[i];
						const pos1 = pair[0];
						const pos2 = pair[1];

						const keywordPattern = labelLowercase.substring(pos1, pos2);
						keywordPatterns.add(keywordPattern);
					}
					for (let keywordPattern of keywordPatterns) {
						// FIXME pst: workarond for wrong replacement <b> tags
						if (keywordPattern === 'b') {
							continue;
						}
						const reg = new RegExp('(' + keywordPattern + ')', 'ig');

						const newHighlighted = newItem.highlighted.replace(reg, '<b>$1</b>');
						newItem.highlighted = newHighlighted;
					}
				}
			}

			return newItem;
		};
	}

	function removeAccents(str) {
		return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
	}

	function isConfirmed(listItem) {
		if (!selectedItem) return false;

		const unproxySelectedItem = JSON.stringify($state.snapshot(selectedItem));
		const unproxyListItem = JSON.stringify($state.snapshot(listItem));

		if (multiple) {
			return unproxySelectedItem.includes(unproxyListItem);
		} else {
			return unproxyListItem === unproxySelectedItem;
		}
	}

	let draggingOver = $state(false);

	function dragstart(event, index) {
		if (orderableSelection) {
			event.dataTransfer.setData('source', index);
		}
	}

	function dragover(event, index) {
		if (orderableSelection) {
			event.preventDefault();
			draggingOver = index;
		}
	}

	function dragleave(event, index) {
		if (orderableSelection) {
			draggingOver = false;
		}
	}

	function drop(event, index) {
		if (orderableSelection) {
			event.preventDefault();
			draggingOver = false;
			let from = parseInt(event.dataTransfer.getData('source'));
			let to = index;
			if (from != to) {
				moveSelectedItem(from, to);
			}
		}
	}

	function moveSelectedItem(from, to) {
		let newSelection = [...selectedItem];
		if (from < to) {
			newSelection.splice(to + 1, 0, newSelection[from]);
			newSelection.splice(from, 1);
		} else {
			newSelection.splice(to, 0, newSelection[from]);
			newSelection.splice(from + 1, 1);
		}
		selectedItem = newSelection;
	}

	function setScrollAwareListPosition() {
		const { height: viewPortHeight } = window.visualViewport;
		const { bottom: inputButtom, height: inputHeight } = inputContainer.getBoundingClientRect();
		const { height: listHeight } = list.getBoundingClientRect();

		if (inputButtom + listHeight > viewPortHeight) {
			list.style.top = `-${listHeight}px`;
		} else {
			list.style.top = `${inputHeight}px`;
		}
	}

	// $inspect(selectedItem);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="{className ? className : ''} autocomplete select is-fullwidth {uniqueId}"
	class:hide-arrow={hideArrow || !items.length}
	class:is-multiple={multiple}
	class:show-clear={clearable}
	class:is-loading={showLoadingIndicator && loading}
>
	{#if multiple}
		<select name={selectName} id={selectId} multiple>
			{#if hasSelection}
				{#each selectedItem as i}
					<option value={valueFunction(i, true)} selected>
						{safeLabelFunction(i)}
					</option>
				{/each}
			{/if}
		</select>
	{:else}
		<select name={selectName} id={selectId}>
			{#if hasSelection}
				<option value={valueFunction(selectedItem, true)} selected>
					{safeLabelFunction(selectedItem)}
				</option>
			{/if}
		</select>
	{/if}

	<div class="input-container" bind:this={inputContainer}>
		{#if multiple && hasSelection}
			{#each selectedItem as tagItem, i (valueFunction(tagItem, true))}
				<div
					draggable={true}
					animate:flip={{ duration: 200 }}
					transition:fade={{ duration: 200 }}
					ondragstart={(event) => dragstart(event, i)}
					ondragover={(event) => dragover(event, i)}
					ondragleave={(event) => dragleave(event, i)}
					ondrop={(event) => drop(event, i)}
					class:is-active={draggingOver === i}
				>
					<!-- <slot name="tag" label={safeLabelFunction(tagItem)} item={tagItem} {unselectItem}>
            <div class="tags has-addons">
              <span class="tag">{safeLabelFunction(tagItem)}</span>
              <span
                class="tag is-delete"
                on:click|preventDefault={unselectItem(tagItem)}
                on:keypress|preventDefault={(e) => {
                  e.key == 'Enter' && unselectItem(tagItem);
                }}
              ></span>
            </div>
          </slot> -->

					{@render tagSlot?.({ label: safeLabelFunction(tagItem), item: tagItem, unselectItem })}
					{#if !tagSlot}
						<div class="tags has-addons">
							<span class="tag">{safeLabelFunction(tagItem)}</span>
							<span
								class="tag is-delete"
								onclick={(e) => {
									e.preventDefault();
									unselectItem(tagItem);
								}}
								onkeypress={(e) => {
									e.preventDefault();
									e.key == 'Enter' && unselectItem(tagItem);
								}}
							></span>
						</div>
					{/if}
				</div>
			{/each}
		{/if}
		<input
			type="text"
			class="{inputClassName ? inputClassName : ''} {noInputStyles
				? ''
				: 'input autocomplete-input'}"
			id={inputId ? inputId : ''}
			autocomplete={html5autocomplete ? 'on' : autocompleteOffValue}
			{placeholder}
			{name}
			{disabled}
			{required}
			{title}
			readonly={readonly || locked}
			{tabindex}
			bind:this={input}
			bind:value={text}
			oninput={onInput}
			onfocus={onFocusInternal}
			onblur={onBlurInternal}
			onkeydown={onKeyDown}
			onclick={onInputClick}
			onkeypress={onKeyPress}
			ondragover={(event) => dragover(event, selectedItem.length - 1)}
			ondrop={(event) => drop(event, selectedItem.length - 1)}
			{...rest}
		/>
		{#if clearable}
			<span
				onclick={clear}
				onkeypress={(e) => {
					e.key == 'Enter' && clear();
				}}
				class="autocomplete-clear-button">{@html clearText}</span
			>
		{/if}
	</div>
	<div
		class="{dropdownClassName ? dropdownClassName : ''} autocomplete-list {showList ? '' : 'hidden'}
    is-fullwidth"
		bind:this={list}
	>
		{#if filteredListItems && filteredListItems.length > 0}
			<!-- <slot name="dropdown-header" nbItems={filteredListItems.length} {maxItemsToShowInList} /> -->
			{@render dropdownHeaderSlot?.({ nbItems: filteredListItems.length, maxItemsToShowInList })}

			{#each filteredListItems as listItem, i}
				<!-- {console.log(highlightIndex)} -->
				{#if listItem && (maxItemsToShowInList <= 0 || i < maxItemsToShowInList)}
					<div
						class="autocomplete-list-item"
						class:selected={i === highlightIndex}
						class:confirmed={isConfirmed(listItem.item)}
						onclick={() => onListItemClick(listItem)}
						onkeypress={(e) => {
							e.key == 'Enter' && onListItemClick(listItem);
						}}
						onpointerenter={() => {
							highlightIndex = i;
						}}
					>
						<!-- <slot name="item" item={listItem.item} label={listItem.highlighted ? listItem.highlighted : listItem.label}>
              {#if listItem.highlighted}
                {@html listItem.highlighted}
              {:else}
                {@html listItem.label}
              {/if}
            </slot> -->
						{@render itemSlot?.({
							item: listItem.item,
							label: listItem.highlighted ? listItem.highlighted : listItem.label
						})}

						{#if !itemSlot}
							{#if listItem.highlighted}
								{@html listItem.highlighted}
							{:else}
								{@html listItem.label}
							{/if}
						{/if}
					</div>
				{/if}
			{/each}

			<!-- <slot name="dropdown-footer" nbItems={filteredListItems.length} {maxItemsToShowInList}>
        {#if maxItemsToShowInList > 0 && filteredListItems.length > maxItemsToShowInList}
          {#if moreItemsText}
            <div class="autocomplete-list-item-no-results">
              ...{filteredListItems.length - maxItemsToShowInList}
              {moreItemsText}
            </div>
          {/if}
        {/if}
      </slot> -->

			{@render dropdownFooterSlot?.({ nbItems: filteredListItems.length, maxItemsToShowInList })}
			{#if !dropdownFooterSlot}
				{#if maxItemsToShowInList > 0 && filteredListItems.length > maxItemsToShowInList}
					{#if moreItemsText}
						<div class="autocomplete-list-item-no-results">
							...{filteredListItems.length - maxItemsToShowInList}
							{moreItemsText}
						</div>
					{/if}
				{/if}
			{/if}
		{:else if loading && loadingText}
			<div class="autocomplete-list-item-loading">
				<!-- <slot name="loading" {loadingText}>{loadingText}</slot> -->

				{@render loadingSlot?.({ loadingText })}
				{#if !loadingSlot}
					{loadingText}
				{/if}
			</div>
		{:else if create}
			<div
				class="autocomplete-list-item-create"
				onclick={selectItem}
				onkeypress={(e) => {
					e.key == 'Enter' && selectItem();
				}}
			>
				<!-- <slot name="create" {createText}>{createText}</slot> -->

				{@render createSlot?.({ createText })}
				{#if !createSlot}
					{createText}
				{/if}
			</div>
		{:else if noResultsText}
			<div class="autocomplete-list-item-no-results">
				<!-- <slot name="no-results" {noResultsText}>{noResultsText}</slot> -->

				{@render noResultsSlot?.({ noResultsText })}
				{#if !noResultsSlot}
					{noResultsText}
				{/if}
			</div>
		{/if}
	</div>
</div>

<svelte:window onclick={onDocumentClick} onscroll={() => (setPositionOnNextUpdate = true)} />

<style>
	.autocomplete {
		min-width: 200px;
		display: inline-block;
		max-width: 100%;
		position: relative;
		vertical-align: top;
		height: auto !important;
	}

	.autocomplete:not(.hide-arrow):not(.is-loading)::after {
		border: 3px solid;
		border-radius: 2px;
		border-right: 0;
		border-top: 0;
		content: ' ';
		display: block;
		height: 0.625em;
		margin-top: -0.4375em;
		pointer-events: none;
		position: absolute;
		top: 50%;
		-webkit-transform: rotate(-45deg);
		transform: rotate(-45deg);
		-webkit-transform-origin: center;
		transform-origin: center;
		width: 0.625em;
		border-color: #3273dc;
		right: 1.125em;
		z-index: 4;
	}

	.autocomplete.show-clear:not(.hide-arrow)::after {
		right: 2.3em;
	}

	.autocomplete * {
		box-sizing: border-box;
	}
	.autocomplete-input {
		font: inherit;
		width: 100%;
		height: 100%;
		padding: 5px 11px;
	}

	.autocomplete:not(.hide-arrow) .autocomplete-input {
		padding-right: 2em;
	}
	.autocomplete.show-clear:not(.hide-arrow) .autocomplete-input {
		padding-right: 3.2em;
	}
	.autocomplete.hide-arrow.show-clear .autocomplete-input {
		padding-right: 2em;
	}

	.autocomplete-list {
		background: #fff;
		position: absolute !important;
		width: 100%;
		overflow-y: auto;
		padding: 10px 0;
		top: 0px;
		border: 1px solid #999;
		max-height: calc(15 * (1rem + 10px) + 15px);
		user-select: none;
		z-index: 1500 !important;
	}
	.autocomplete-list:empty {
		padding: 0;
	}
	.autocomplete-list-item {
		padding: 5px 15px;
		color: #333;
		cursor: pointer;
		line-height: 1;
		overflow-x: hidden;
	}

	.autocomplete-list-item.confirmed {
		background-color: #789fed;
		color: #fff;
	}
	.autocomplete-list-item.selected {
		background-color: #2e69e2;
		color: #fff;
	}
	.autocomplete-list-item-no-results {
		padding: 5px 15px;
		color: #999;
		line-height: 1;
	}
	.autocomplete-list-item-create {
		padding: 5px 15px;
		line-height: 1;
	}
	.autocomplete-list-item-loading {
		padding: 5px 15px;
		line-height: 1;
	}

	.autocomplete-list.hidden {
		visibility: hidden;
	}

	.autocomplete.show-clear .autocomplete-clear-button {
		cursor: pointer;
		display: block;
		text-align: center;
		position: absolute;
		right: 0.1em;
		padding: 0.3em 0.6em;
		top: 50%;
		-webkit-transform: translateY(-50%);
		-ms-transform: translateY(-50%);
		transform: translateY(-50%);
		z-index: 4;
		font-family: Arial, Helvetica, sans-serif;
	}

	.autocomplete:not(.show-clear) .autocomplete-clear-button {
		display: none;
	}

	.autocomplete select {
		display: none;
	}

	.autocomplete.is-multiple .input-container {
		height: auto;
		box-shadow: inset 0 1px 2px rgba(10, 10, 10, 0.1);
		border-radius: 4px;
		border: 1px solid #b5b5b5;
		padding-left: 0.4em;
		padding-right: 0.4em;
		display: flex;
		flex-wrap: wrap;
		align-items: stretch;
		background-color: #fff;
	}

	.autocomplete.is-multiple .tag {
		display: flex;
		margin-top: 0.5em;
		margin-bottom: 0.3em;
	}

	.autocomplete.is-multiple .tag.is-delete {
		cursor: pointer;
	}

	.autocomplete.is-multiple .tags {
		margin-right: 0.3em;
		margin-bottom: 0;
	}

	.autocomplete.is-multiple .autocomplete-input {
		display: flex;
		width: 100%;
		flex: 1 1 50px;
		min-width: 3em;
		border: none;
		box-shadow: none;
		background: none;
	}

	/* --- */
	.autocomplete .tags {
		align-items: center;
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-start;
	}

	.autocomplete .tags.has-addons .tag {
		margin-right: 0;
	}

	.autocomplete .tags.has-addons .tag:not(:first-child) {
		margin-left: 0;
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
	}

	.autocomplete .tag:not(body) {
		align-items: center;
		background-color: whitesmoke;
		border-radius: 4px;
		color: #4a4a4a;
		display: inline-flex;
		font-size: 0.75rem;
		height: 2em;
		justify-content: center;
		line-height: 1.5;
		padding-left: 0.75em;
		padding-right: 0.75em;
		white-space: nowrap;
	}

	.autocomplete .tag:not(body).is-delete {
		margin-left: 1px;
		padding: 0;
		position: relative;
		width: 2em;
	}

	.autocomplete .tag:not(body).is-delete::before {
		height: 1px;
		width: 50%;
	}

	.autocomplete .tag:not(body).is-delete::before,
	.tag:not(body).is-delete::after {
		background-color: currentColor;
		content: '';
		left: 50%;
		position: absolute;
		top: 50%;
		transform: translateX(-50%) translateY(-50%) rotate(45deg);
		transform-origin: center center;
	}

	.autocomplete .tag:not(body).is-delete::after {
		height: 50%;
		width: 1px;
	}
</style>
