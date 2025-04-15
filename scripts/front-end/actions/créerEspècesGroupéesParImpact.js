import {chargerActivitésMéthodesTransports} from './dossier.js'

/** @import { ActivitéMenançante, DescriptionMenacesEspèces, FauneNonOiseauAtteinte, FloreAtteinte, OiseauAtteint } from '../../types/especes.d.ts' */


/** @type {ActivitéMenançante} */
const ACTIVITÉ_DESTRUCTION_CAPTURE_PERTURBATION = {
    Code: 'mix-1-10-3-30-6-40',
    "étiquette affichée": 'Destruction intentionnelle, capture ou perturbation intentionnelle de spécimens',
    "Libellé long": 'Destruction intentionnelle, capture ou perturbation intentionnelle de spécimens',
    Espèces: 'faune non-oiseau', // champ inutilisé
    Méthode: 'n', // champ inutilisé
    transport: 'n' // champ inutilisé
}

const VALEUR_NON_RENSEIGNÉ = `(non renseigné)`



/**
 * @param {OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte} espèceImpactée
 * @returns {string}
 */
 function individus(espèceImpactée){
    return espèceImpactée.nombreIndividus || VALEUR_NON_RENSEIGNÉ
}

/**
 * @param {OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte} espèceImpactée
 * @returns {string}
 */
function surface(espèceImpactée){
    return espèceImpactée.surfaceHabitatDétruit ? `${espèceImpactée.surfaceHabitatDétruit}m²` : VALEUR_NON_RENSEIGNÉ
}

/**
 * @param {OiseauAtteint} espèceImpactée
 * @returns {string}
 */
 function nids(espèceImpactée){
    return espèceImpactée.nombreNids ? `${espèceImpactée.nombreNids}` : VALEUR_NON_RENSEIGNÉ
}

/**
 * @param {OiseauAtteint} espèceImpactée
 * @returns {string}
 */
function œufs(espèceImpactée){
    return espèceImpactée.nombreOeufs ? `${espèceImpactée.nombreOeufs}` : VALEUR_NON_RENSEIGNÉ
}



/** @type {Map<ActivitéMenançante['Code'] | undefined, Map<string, ((esp: any) => string)>>}  */
let activitéVersDonnéesSecondaires = new Map([
    // 1, 10, 3, 30, 6, 40
    [ ACTIVITÉ_DESTRUCTION_CAPTURE_PERTURBATION.Code, new Map([ [ `Nombre d'individus`, individus ] ]) ],

    [ '2', new Map([ [ `Nombre d'individus`, individus ] ]) ],
    [ '4-1-pitchou-aires', new Map([ [ `Surface`, surface ] ]) ],
    [ '4-2-pitchou-nids', new Map([ [ `Nombre de nids`, nids ] ]) ],
    [ '4-3-pitchou-œufs', new Map([ [ `Nombre d'œufs`, œufs ] ]) ],
    [ '5', new Map([ [ `Nombre d'œufs`, œufs ] ]) ],
    [ '7', new Map([ [ `Nombre d'individus`, individus ] ]) ],
    [ '8', new Map([ [ `Nombre d'individus`, individus ] ]) ],
    [ '20', new Map([ [ `Nombre d'individus`, individus ] ]) ],
    // insatisfaisant pour "Destruction intentionnelle d’oeufs/pontes" (faune non-oiseau)
    [ '50', new Map([ [ `Nombre d'individus`, individus ] ]) ],
    [ '60', new Map([ [ `Surface`, surface ] ]) ],
    [ '70', new Map([ [ `Nombre d'individus`, individus ] ]) ],
    [ '80', new Map([ [ `Surface`, surface ] ]) ],
    [ '90', new Map([ [ `Nombre d'individus`, individus ] ]) ],
    [ undefined, new Map([ [ `Nombre d'individus`, individus ] ]) ]
])


/**
 * @typedef EspèceImpactéeSimplifiée
 * @prop {string} nomVernaculaire
 * @prop {string} nomScientifique
 * @prop {string} CD_REF
 * @prop {string[]} détails // impacts quantifiés pour cette activité
 */


/**
 * @typedef {Object} EspècesParActivité
 * @prop {string} activité
 * @prop {string[]} impactsRésiduels
 * @prop {EspèceImpactéeSimplifiée[]} espèces
 */


/**
 * 
 * @param {DescriptionMenacesEspèces} espècesImpactées
 * @returns {Promise<EspècesParActivité[]>}
 */
export async function créerEspècesGroupéesParImpact(espècesImpactées) {

    /** @type {Map<ActivitéMenançante['Code'], ActivitéMenançante>} */
    const activitéByCode = await chargerActivitésMéthodesTransports()
        .then(({activités}) => {
            // Rajouter les activités spécifiques Pitchou
            // Les activités sont standardisées à l'échelle européenne
            // https://dd.eionet.europa.eu/schemas/habides-2.0/derogations.xsd (type 'activitiesType')
            // Pour les besoins de Pitchou, nous rajoutons des activités 
            // Nous essayons d'utiliser des identifiants qui ne collisionnerons pas avec le futur

            const activité4 = activités.oiseau.get('4')
            if(!activité4){
                throw Error(`Activité 4 manquante`)
            }

            /** @type {Map<ActivitéMenançante['Code'], ActivitéMenançante>} */
            // @ts-ignore
            const activitésAdditionnelles = new Map([
                {
                    ...activité4,
                    Code: '4-1-pitchou-aires',
                    "étiquette affichée": `Destruction d’aires de repos ou reproduction`
                },
                {
                    ...activité4,
                    Code: '4-2-pitchou-nids',
                    "étiquette affichée": `Destruction de nids`
                },
                {
                    ...activité4,
                    Code: '4-3-pitchou-œufs',
                    "étiquette affichée": `Destruction d'œufs`
                }
            ].map(a => [a.Code, a]))

            return new Map([
                ...activités.oiseau, 
                ...activitésAdditionnelles, 
                ...activités['faune non-oiseau'], 
                ...activités.flore
            ])
        })



    /** @type {Map<ActivitéMenançante | undefined, EspèceImpactéeSimplifiée[]>} */
    const _espècesImpactéesParActivité = new Map()

    /**
     * 
     * @param {OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte} espèceImpactée
     */
    function push(espèceImpactée){
        const activité = espèceImpactée.activité
        const esps = _espècesImpactéesParActivité.get(activité) || []
        const donnéesSecondaires = activitéVersDonnéesSecondaires.get(espèceImpactée.activité?.Code)

        if(!donnéesSecondaires){
            throw new Error(`Pas de données secondaires pour activité ${espèceImpactée.activité?.Code}`)
        }

        esps.push({
            CD_REF: espèceImpactée.espèce.CD_REF,
            nomScientifique: [...espèceImpactée.espèce.nomsScientifiques][0],
            nomVernaculaire: [...espèceImpactée.espèce.nomsVernaculaires][0],
            détails: [...donnéesSecondaires.values()]
                .map(funcDétail => funcDétail(espèceImpactée))
        })
        _espècesImpactéesParActivité.set(activité, esps)
    }

    
    for(const classif of (/** @type {const} */ (['oiseau', 'faune non-oiseau', 'flore']))){
        if(espècesImpactées[classif]){
            for(const espèceImpactée of espècesImpactées[classif]){
                const activité = espèceImpactée.activité
                const code  = activité?.Code || ''
                if(code === '4'){ // Destruction intentionnelle de nids, œufs, aires de repos ou reproduction
                    // séparer en sous-activités
                    if(espèceImpactée.surfaceHabitatDétruit){
                        push({
                            ...espèceImpactée,
                            activité: activitéByCode.get('4-1-pitchou-aires')
                        })
                    }

                    // @ts-ignore
                    if(espèceImpactée.nombreNids){
                        push({
                            ...espèceImpactée,
                            activité: activitéByCode.get('4-2-pitchou-nids')
                        })
                    }

                    // @ts-ignore
                    if(espèceImpactée.nombreOeufs){
                        push({
                            ...espèceImpactée,
                            activité: activitéByCode.get('4-3-pitchou-œufs')
                        }) 
                    }

                }
                else{
                    if(['1', '10', '3', '30', '6', '40'].includes(code)){
                        push({
                            ...espèceImpactée,
                            activité: ACTIVITÉ_DESTRUCTION_CAPTURE_PERTURBATION
                        })
                    }
                    else
                        push(espèceImpactée)
                }
            }
        }
    }

    for(const [activité, esps] of _espècesImpactéesParActivité){
        _espècesImpactéesParActivité.set(
            activité, 
            esps.toSorted(({nomScientifique: nom1}, {nomScientifique: nom2}) =>  {
                if (nom1 < nom2) { return -1; }
                if (nom1 > nom2) { return 1; }
                return 0;
            })
        )
    }

    return [..._espècesImpactéesParActivité]
        .map(([activité, espèces]) => ({
            activité: activité ? activité['étiquette affichée'] : `Type d'impact non-renseignée`, 
            // @ts-ignore
            impactsRésiduels: [...activitéVersDonnéesSecondaires.get(activité?.Code).keys()],
            espèces
        }))
}