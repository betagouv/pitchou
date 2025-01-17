//@ts-check

import page from 'page'

import { replaceComponent } from '../routeComponentLifeCycle.js'
import store from '../store.js'
import { svelteTarget } from '../config.js'
import { mapStateToSqueletteProps } from '../mapStateToSqueletteProps.js';
import RedactionArretePrefectoral from '../components/screens/RedactionArretePrefectoral.svelte';
import { chargerActivitésMéthodesTransports, chargerListeEspècesProtégées } from '../actions/main.js';
import { importDescriptionMenacesEspècesFromOdsArrayBuffer } from '../../commun/outils-espèces.js';
import { getDossierComplet } from '../actions/dossier.js';

import {HTTPError, MediaTypeError} from '../../commun/errors.js'

/** @import {ComponentProps} from 'svelte' */
/** @import {PitchouState} from '../store.js' */
/** @import {DossierId} from '../../types/database/public/Dossier.ts' */
/** @import {DescriptionMenacesEspèces} from '../../types/especes.d.ts' */

const ODS_MEDIA_TYPE = 'application/vnd.oasis.opendocument.spreadsheet'

/**
 * @param {Object} ctx
 * @param {Object} ctx.params
 * @param {string} ctx.params.dossierId
 */
export default async ({params: {dossierId}}) => {
    /** @type {DossierId} */
    // @ts-ignore
    const id = Number(dossierId)
    const { state } = store
    
    const espècesProtégées = chargerListeEspècesProtégées()
    const actMétTrans = chargerActivitésMéthodesTransports()

    const dossier = await getDossierComplet(id)
    
    // TODO: expliquer que le dossier n'existe pas ?
    if (!dossier) return page('/')

    const {espèceByCD_REF} = await espècesProtégées
    const { activités, méthodes, transports } = await actMétTrans

    /** @type {Promise<DescriptionMenacesEspèces | undefined>} */
    let espècesImpactées = Promise.resolve(undefined)

    if(dossier.espècesImpactées && dossier.espècesImpactées.contenu){
        espècesImpactées = importDescriptionMenacesEspècesFromOdsArrayBuffer(
            dossier.espècesImpactées.contenu,
            espèceByCD_REF,
            activités,
            méthodes,
            transports
        )
    }

    /**
     * 
     * @param {PitchouState} state
     * @returns {ComponentProps<RedactionArretePrefectoral>}
     */
    function mapStateToProps(state){
        const dossier = state.dossiersComplets.get(id)

        if(!dossier) throw new TypeError(`Dossier avec id '${id}' manquant dans le store`)

        return {
            ...mapStateToSqueletteProps(state),
            dossier,
            espècesImpactées
        }
    }   
    
    const redactionArretePrefectoral = new RedactionArretePrefectoral({
        target: svelteTarget,
        props: mapStateToProps(state),
    });

    replaceComponent(redactionArretePrefectoral, mapStateToProps)
}