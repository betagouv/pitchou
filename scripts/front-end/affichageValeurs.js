
/**
 * 
 * @param {boolean | null | undefined} b 
 * @return {string}
 */
export function afficherBool(b){
    return b ? 'Oui' : 'Non'
}



/**
 * 
 * @param {number | undefined | null} n
 * @return {string}
 */
export function afficherNumber(n){
    if(n === undefined || n === null){
        return 'Non-défini'
    }

    if(Number.isNaN(n) || !Number.isFinite(n)){
        return 'Non-défini'
    }

    return n.toString()
}


/**
 * 
 * @param {string | undefined | null} s
 * @return {string}
 */
export function afficherString(s){
    if(s === undefined || s === null || s === ''){
        return '(vide)'
    }

    return s;
}