//@ts-check

import { parse as parseDate } from "date-fns"

/**
 * 
 * @param {any} d 
 * @returns {boolean}
 */
function isValidDate(d) {
    return d instanceof Date && !Number.isNaN(d.valueOf());
}

/**
 * 
 * @param {string | Date | number | undefined} d // peut-être une date
 */
export function recoverDate(d){
    if (typeof d === 'number') { return undefined }

    if (typeof d === 'object') {
        if (isValidDate(d)) { 
            return d 
        } else {
            return undefined
        }
    } 

    if(!d)
        return undefined

    // typeof d === 'string'
    d = d.trim()

    let date = parseDate(d, 'dd/MM/yyyy', new Date())

    if(!isValidDate(date)){
        date = parseDate(d, 'dd/MM/yy', new Date())
    }
    if(!isValidDate(date)){
        date = parseDate(d, 'yyyy', new Date())
    }

    // let's try the first chars in case there are several dates

    if(!isValidDate(date)){
        date = parseDate(d.slice(0, 'dd/MM/yyyy'.length), 'dd/MM/yyyy', new Date())
    }
    if(!isValidDate(date)){
        date = parseDate(d.slice(0, 'dd/MM/yy'.length), 'dd/MM/yy', new Date())
    }

    if(isValidDate(date)){
        return date
    }
    else{
        //console.warn(`Date non reconnue (${d})`)
        return undefined
    }
}

/**
 * 
 * @param {string} nomCommune 
 * @returns 
 */
export function normalizeNomCommune(nomCommune) {
    return nomCommune
        .replace(/-|'/g, ' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove accents
        .toLowerCase()
}