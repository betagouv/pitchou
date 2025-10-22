
/** @import { ActivitéMenançante, DescriptionMenacesEspèces, ImpactQuantifié, FauneNonOiseauAtteinte, FloreAtteinte, OiseauAtteint } from '../../types/especes.d.ts' */


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

/** @type {Map<ImpactQuantifié, ((esp: any) => string)>}  */
const getterImpactQuantifié = new Map([
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
 * @prop {ImpactQuantifié[]} impactsQuantifiés
 * @prop {EspèceImpactéeSimplifiée[]} espèces
 */


/**
 *
 * @param {DescriptionMenacesEspèces} espècesImpactées
 * @param {Map<ActivitéMenançante['Identifiant Pitchou'], ImpactQuantifié[]>} activitéVersImpactsQuantifiés
 * @returns {EspècesParActivité[]}
 */
export function créerEspècesGroupéesParImpact(espècesImpactées, activitéVersImpactsQuantifiés) {

    /** @type {Map<ActivitéMenançante | undefined, EspèceImpactéeSimplifiée[]>} */
    const _espècesImpactéesParActivité = new Map()

    /**
     *
     * @param {OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte} espèceImpactée
     */
    function push(espèceImpactée){
        const activité = espèceImpactée.activité

        const esps = _espècesImpactéesParActivité.get(activité) || []
        const impactsQuantifiés = activitéVersImpactsQuantifiés.get(activité ? activité['Identifiant Pitchou'] : '') || []

        esps.push({
            CD_REF: espèceImpactée.espèce.CD_REF,
            nomScientifique: [...espèceImpactée.espèce.nomsScientifiques][0],
            nomVernaculaire: [...espèceImpactée.espèce.nomsVernaculaires][0],
            détails: [...impactsQuantifiés]
                .map((donnéeSecondaire) => {
                    const funcDetail = getterImpactQuantifié.get(donnéeSecondaire)

                    if (!funcDetail) {
                        throw new Error(`Fonction de récupération des détails de l'espèce non définie pour le type de données ${donnéeSecondaire}`)
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
            impactsQuantifiés: activitéVersImpactsQuantifiés.get(activité ? activité['Identifiant Pitchou'] : '') || [],
            espèces
        }))
}
