
/** @import { ActivitéMenançante, DescriptionMenacesEspèces, DonnéesSecondaires, FauneNonOiseauAtteinte, FloreAtteinte, OiseauAtteint } from '../../types/especes.d.ts' */



/** @type {ActivitéMenançante} */
const ACTIVITÉ_DESTRUCTION_CAPTURE_PERTURBATION = {
    "Identifiant Pitchou": 'mix-1-10-3-30-6-40',
    "Libellé Pitchou": 'Destruction intentionnelle, capture ou perturbation intentionnelle de spécimens',
    "Libellé activité directive européenne": 'Destruction intentionnelle, capture ou perturbation intentionnelle de spécimens',
    Méthode: 'Non', // champ inutilisé
    "Moyen de poursuite": 'Non' // champ inutilisé
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

/** @type {Map<DonnéesSecondaires, ((esp: any) => string)>}  */
const getterDonnéesSecondaires = new Map([
    ["Nombre d'individus", individus],
    ["Nids", nids],
    ["Œufs", œufs],
    ["Surface habitat détruit (m²)", surface],
]);

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
 * @prop {DonnéesSecondaires[]} impactsQuantifiés
 * @prop {EspèceImpactéeSimplifiée[]} espèces
 */


/**
 *
 * @param {DescriptionMenacesEspèces} espècesImpactées
 * @param {Map<ActivitéMenançante['Identifiant Pitchou'], DonnéesSecondaires[]>} activitéVersDonnéesSecondaires
 * @returns {EspècesParActivité[]}
 */
export function créerEspècesGroupéesParImpact(espècesImpactées, activitéVersDonnéesSecondaires) {

    /** @type {Map<ActivitéMenançante | undefined, EspèceImpactéeSimplifiée[]>} */
    const _espècesImpactéesParActivité = new Map()

    /**
     *
     * @param {OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte} espèceImpactée
     */
    function push(espèceImpactée){
        const activité = espèceImpactée.activité

        if (!activité) {
            // TODO: Possiblement pas le bon comportement
            throw new Error(`Activité non définie`)
        }

        const esps = _espècesImpactéesParActivité.get(activité) || []
        const donnéesSecondaires = activitéVersDonnéesSecondaires.get(activité['Identifiant Pitchou'])

        if(!donnéesSecondaires){
            throw new Error(`Pas de données secondaires pour activité ${activité['Identifiant Pitchou']}`)
        }

        esps.push({
            CD_REF: espèceImpactée.espèce.CD_REF,
            nomScientifique: [...espèceImpactée.espèce.nomsScientifiques][0],
            nomVernaculaire: [...espèceImpactée.espèce.nomsVernaculaires][0],
            détails: [...donnéesSecondaires]
                .map((donnéeSecondaire) => {
                    const funcDetail = getterDonnéesSecondaires.get(donnéeSecondaire)

                    if (!funcDetail) {
                        throw new Error(`Fonction de récupération des détails de l'espèce non définie pour le type ${donnéeSecondaire}`)
                    }

                    return funcDetail(espèceImpactée)
                })
        })
        _espècesImpactéesParActivité.set(activité, esps)
    }


    for(const classif of (/** @type {const} */ (['oiseau', 'faune non-oiseau', 'flore']))){
        if(espècesImpactées[classif]){
            for(const espèceImpactée of espècesImpactées[classif]){
                push(espèceImpactée)
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
            activité: activité ? activité['Libellé Pitchou'] : `Type d'impact non-renseignée`,
            impactsQuantifiés: activitéVersDonnéesSecondaires.get(activité ? activité['Identifiant Pitchou'] : '') || [],
            espèces
        }))
}
