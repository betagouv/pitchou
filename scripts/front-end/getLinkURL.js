/**
     * @param {string} selector 
     * @returns {string}
     */
export function getURL(selector){
    const element = document.head.querySelector(selector)

    if(!element){
        throw new TypeError(`Élément ${selector} manquant`)
    }

    const hrefAttribute = element.getAttribute('href')

    if(!hrefAttribute){
        throw new TypeError(`Attribut "href" manquant sur ${selector}`)
    }

    return hrefAttribute
}