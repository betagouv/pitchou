
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
 * @param {Map<string, ActivitéMenançante & {impactsQuantifiés: ImpactQuantifié[]}>} identifiantPitchouVersActivitéEtImpactsQuantifiés
 * @returns {EspècesParActivité[]}
 */
export function créerEspècesGroupéesParImpact(espècesImpactées, identifiantPitchouVersActivitéEtImpactsQuantifiés) {

    /** @type {Map<ActivitéMenançante['Identifiant Pitchou'] | undefined, EspèceImpactéeSimplifiée[]>} */
    const _espècesImpactéesParIdentifiantActivité = new Map()

    /**
     *
     * @param {OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte} espèceImpactée
     */
    function push(espèceImpactée){
        const identifiantPitchou = espèceImpactée.activité ? espèceImpactée.activité['Identifiant Pitchou'] : undefined

        const esps = _espècesImpactéesParIdentifiantActivité.get(identifiantPitchou) || []
        const impactsQuantifiés = identifiantPitchouVersActivitéEtImpactsQuantifiés.get(identifiantPitchou ?? '')?.impactsQuantifiés || []

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
        _espècesImpactéesParIdentifiantActivité.set(identifiantPitchou, esps)
    }


    for(const classif of (/** @type {const} */ (['oiseau', 'faune non-oiseau', 'flore']))){
        if(espècesImpactées[classif]){
            for(const espèceImpactée of espècesImpactées[classif]){
                push(espèceImpactée)
            }
        }
    }

    for(const [activité, esps] of _espècesImpactéesParIdentifiantActivité){
        _espècesImpactéesParIdentifiantActivité.set(
            activité,
            esps.toSorted(({nomScientifique: nom1}, {nomScientifique: nom2}) =>  {
                if (nom1 < nom2) { return -1; }
                if (nom1 > nom2) { return 1; }
                return 0;
            })
        )
    }

    return [..._espècesImpactéesParIdentifiantActivité]
        .map(([identifiant, espèces]) => ({
            activité: identifiantPitchouVersActivitéEtImpactsQuantifiés.get(identifiant ?? '')?.['Libellé Pitchou'] ?? `Type d'impact non-renseignée`,
            impactsQuantifiés: identifiantPitchouVersActivitéEtImpactsQuantifiés.get(identifiant ? identifiant : '')?.impactsQuantifiés || [],
            espèces
        }))
}
