//@ts-check

import page from 'page'

import Accueil from './routes/Accueil.js'
import Dossier from './routes/Dossier.js';
import RedactionArretePrefectoral from './routes/RedactionArretePrefectoral.js';
import DossierMessagerie from './routes/DossierMessagerie.js'
import SaisieEspèces from './routes/SaisieEspèces.js';
import ImportHistoriqueNouvelleAquitaine from './routes/import-historique/NouvelleAquitaine.js'
import PreremplissageDerogation from './routes/PreremplissageDerogation.js';

import { init } from './actions/main.js';

page('/', Accueil)
page('/dossier/:dossierId', Dossier)
page('/dossier/:dossierId/redaction-arrete-prefectoral', RedactionArretePrefectoral)
page('/dossier/:dossierId/messagerie', DossierMessagerie)
page('/saisie-especes', SaisieEspèces)
page('/import-historique/nouvelle-aquitaine', ImportHistoriqueNouvelleAquitaine)
page('/preremplissage-derogation', PreremplissageDerogation)

init()
    .then(() => page.start())
    .catch(error => {
        console.error(`Erreur à l'initialisation`, error)
    })
