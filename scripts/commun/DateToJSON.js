import {formatISO} from 'date-fns'

/**
 * Cette fonction renvoie la date supprimant la partie horaire et la timezone.
 * 
 * Cette fonction existe pour résoudre un problème de transmission de Date en JSON
 * 
 * Quand une date est récupérée d'un input Date, l'heure est définie à 00:00 par défaut (heure locale du navigateur)
 * 
 * Lors d'un appel JSON.stringify, la date est transmise en ISO8601, mais avec les fuseaux horaires et GMT+00
 * (il s'agit peut-être de la veille à 23h par exemple)
 * 
 */

export default function toJSONPerserveDate(){
    // @ts-ignore
    return formatISO(this, {representation: 'date'})
}