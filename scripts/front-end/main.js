//@ts-check

import page from 'page'

import Accueil from './routes/Accueil.js'
import Dossier from './routes/Dossier.js';
import RedactionArretePrefectoral from './routes/RedactionArretePrefectoral.js';
import DossierMessagerie from './routes/DossierMessagerie.js'
import DossierDescription from './routes/DossierDescription.js'
import SaisieEspèces from './routes/SaisieEspèces.js';
import ImportHistoriqueNouvelleAquitaine from './routes/import-historique/NouvelleAquitaine.js'
import PreremplissageDerogation from './routes/PreremplissageDerogation.js';
import TmpStats from './routes/TmpStats.js';

import { init } from './actions/main.js';


page('/', Accueil)

page('/dossier/:dossierId', Dossier)
page('/dossier/:dossierId/description', DossierDescription)
page('/dossier/:dossierId/messagerie', DossierMessagerie)
page('/dossier/:dossierId/redaction-arrete-prefectoral', RedactionArretePrefectoral)

page('/saisie-especes', SaisieEspèces)
page('/preremplissage-derogation', PreremplissageDerogation)
page('/tmp/stats', TmpStats)

page('/import-historique/nouvelle-aquitaine', ImportHistoriqueNouvelleAquitaine)

init()
    .then(() => page.start())
    .catch(error => {
        console.error(`Erreur à l'initialisation`, error)
    })
