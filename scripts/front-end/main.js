//@ts-check

import page from 'page'

import Accueil from './routes/Accueil.js'
import Dossier from './routes/Dossier.js';
import SaisieEspèces from './routes/SaisieEspèces.js';
import ImportHistoriqueNouvelleAquitaine from './routes/import-historique/NouvelleAquitaine.js'
import PreremplissageDerogation from './routes/PreremplissageDerogation.js';
import ModifierDossier from './routes/ModifierDossier.js'

import { init } from './actions/main.js';

page('/', Accueil)
page('/dossier/:dossierId', Dossier)
page('/saisie-especes', SaisieEspèces)
page('/import-historique/nouvelle-aquitaine', ImportHistoriqueNouvelleAquitaine)
page('/preremplissage-derogation', PreremplissageDerogation)
page('/dossier/:dossierId/modifier', ModifierDossier)

init()
    .then(() => page.start())
    .catch(error => {
        console.error(`Erreur à l'initialisation`, error)
    })
