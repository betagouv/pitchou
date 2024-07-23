//@ts-check

import remplirAnnotations from '../scripts/server/démarches-simplifiées/remplirAnnotations.js'

throw `PPP
    remplir l'annotation nom porteur de projet du dossier https://www.demarches-simplifiees.fr/procedures/88444/dossiers/19155152/annotations-privees
`

await remplirAnnotations(
    token, 
    {
        "Historique - nom porteur": 'Steven Universe'
    }, 
    {
        dossierId: 19155152,
        instructeurId: 'hardocder oim'
    }
)