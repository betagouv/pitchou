import {formatISO} from 'date-fns'

/**
 * Cette fonction existe pour résoudre un problème de transmission de Date en JSON
 * 
 * Quand une date est récupérée d'un input Date, elle est ses heure à 00:00 (heure locale du navigateur)
 * 
 * Quand la date est transmise, elle est transmise en ISO8601, mais avec les fuseaux horaires, il s'agit 
 * peut-être de la veille à 23h par exemple
 * 
 * Cette fonction, appliquée à la date
 */

export default function toJSONPerserveDate(){
    // @ts-ignore
    return formatISO(this, {representation: 'date'})
}