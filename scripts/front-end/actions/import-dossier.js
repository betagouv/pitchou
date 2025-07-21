//@ts-check

/**
 * @typedef {Object} GeoAPIDépartement
 * @property {string} code
 * @property {string} nom
 */

const départementsParCode = {
    21: "Côte-d'Or",
    25: "Doubs",
    39: "Jura",
    58: "Nièvre",
    70: "Haute-Saône",
    71: "Saône-et-Loire",
    89: "Yonne",
    90: "Territoire de Belfort",
};

/**
 * Formate une valeur (code ou chaîne) en un ou plusieurs départements reconnus.
 * @param {string | number} valeur
 * @returns {[GeoAPIDépartement, ...GeoAPIDépartement]}
 */
export function formaterDépartementDepuisValeur(valeur) {
    const départementValides = Object.keys(départementsParCode).map((dep) => dep.toString());

    if (typeof valeur === 'number' && [21,25,39,58,70,71,89,90].includes(valeur)) {
        /** @type {keyof typeof départementsParCode} */
        // @ts-ignore
        const code = valeur;
        return [{
            code: code.toString(),
            nom: départementsParCode[code]
        }];
    }
    if (typeof valeur === 'string') {
        const blocs = valeur.split('-');
        /** @type {GeoAPIDépartement[]} */
        const départements = [];
        for (const bloc of blocs) {
            if (départementValides.includes(bloc)) {
                /** @type {keyof typeof départementsParCode} */
                // @ts-ignore
                const code = bloc;
                départements.push({
                    code: code.toString(),
                    nom: départementsParCode[code]
                });
            }
        }
        if (départements.length >= 1) {
            // On force le cast car la logique garantit un tableau non vide
            return /** @type {[GeoAPIDépartement, ...GeoAPIDépartement[]]} */ (départements);
        }
    }
    // Par défaut, on retourne le département Côte-d'Or
    return [{
        code: '21',
        nom: `Côte-d'Or`
    }];
} 