//@ts-check

// adapted from https://developer.mozilla.org/en-US/docs/Glossary/Base64#solution_1_%E2%80%93_escaping_the_string_before_encoding_it
/**
 *
 * @param {string} s // cleartext string
 * @returns {string} // utf-8-encoded base64 string
 */
export function UTF8ToB64(s) {
    return btoa(unescape(encodeURIComponent(s)))
}

/**
 * Normalisation du nom vernaculaire ou scientifique d'une seule espèce
 * @param {string} nom 
 * @returns {string}
 */
export function normalizeNomEspèce(nom){
    return nom
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove accents
        .toLowerCase()
        .replaceAll('(le)', '')
        .replaceAll('(la)', '')
        .replaceAll(`(l')`, '')
        .trim()
}

/**
 * Normalisation d'un texte long pouvant contenir des noms d'espèces
 * @param {string} texte 
 * @returns {string}
 */
export function normalizeTexteEspèce(texte){
    return texte
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove accents
        .replaceAll("’", "'")
        .toLowerCase()
}

/**
 *
 * @param {string} texte
 * @returns {string}
 */
export function retirerAccents(texte) {
    return texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}
  