function ÉvènementPhaseDossier_phase_typeDossierPhase(output){
    const ÉvènementPhaseDossierKey = 'scripts/types/database/public/ÉvènementPhaseDossier'

    const {declarations} = output[ÉvènementPhaseDossierKey]

    const int0 = declarations[0]
    const prop0 = int0.properties[0]
    //console.log('prop0', prop0)

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

module.exports = {
    customTypeMap: {
        'pg_catalog.bytea': 'Buffer'
    },

    preRenderHooks: [
        ÉvènementPhaseDossier_phase_typeDossierPhase
    ]
}
