//@ts-check

/** @type {Element | null} */
const _svelteTarget = document.querySelector('.svelte-main')

if(!_svelteTarget){
    throw new TypeError(`L'élement ".svelte-main" n'a pas été trouvé dans la page`)
}

export const svelteTarget = _svelteTarget