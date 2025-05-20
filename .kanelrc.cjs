function ÉvènementPhaseDossier_phase_typeDossierPhase(output){
    const ÉvènementPhaseDossierKey = 'scripts/types/database/public/ÉvènementPhaseDossier'

    const {declarations} = output[ÉvènementPhaseDossierKey]

    for(const {properties} of declarations){
        for(const prop of properties){
            if(prop.name === 'phase'){
                prop.typeImports = [
                    {
                        name: 'DossierPhase',
                        path: 'scripts/types/API_Pitchou.ts',
                        isAbsolute: false,
                        isDefault: false,
                        importAsType: true
                    }
                ]
                prop.typeName = 'DossierPhase'
            }
        }
        
        //console.log('properties', intface.properties)
    }

    return output
}

/**
 * 
 * @param {string} outputKey 
 * @param {string} propertyName 
 * @param {string} typeName 
 * @returns 
 */
function makePreRenderHook(outputKey, propertyName, typeName){
    return function Dossier_scientifique_type_demande(output){
        const {declarations} = output[outputKey]

        for(const {properties} of declarations){
            if(properties){
                for(const prop of properties){
                    if(prop.name === propertyName){
                        prop.typeName = typeName
                    }
                }
            }
        }

        return output
    }
}

const Dossier_scientifique_type_demande = makePreRenderHook(
    'scripts/types/database/public/Dossier', 'scientifique_type_demande', 'string[]'
)
const Dossier_scientifique_mode_capture = makePreRenderHook(
    'scripts/types/database/public/Dossier', 'scientifique_mode_capture', 'string[]'
)



module.exports = {
    customTypeMap: {
        'pg_catalog.bytea': 'Buffer'
    },

    preRenderHooks: [
        ÉvènementPhaseDossier_phase_typeDossierPhase,
        Dossier_scientifique_type_demande,
        Dossier_scientifique_mode_capture
    ]
}
