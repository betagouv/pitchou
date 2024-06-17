//@ts-check

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
        .toLowerCase()
}