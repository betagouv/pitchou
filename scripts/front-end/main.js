//@ts-check

import page from 'page'

import Accueil from './routes/Accueil.js'
import Dossier from './routes/Dossier.js';
import SaisieEspèces from './routes/SaisieEspèces.js';
import PreremplissageDerogation from './routes/PreremplissageDerogation.js';
import TmpStats from './routes/TmpStats.js';
import ImportDossier from './routes/importDossier.js';

import { init } from './actions/main.js';
import Stats from './routes/Stats.js';


page('/', Accueil)

page('/dossier/:dossierId', Dossier)

page('/saisie-especes', SaisieEspèces)
page('/preremplissage-derogation', PreremplissageDerogation)
page('/tmp/stats', TmpStats)
page('/stats', Stats)
page('/import-dossier-historiques/bourgogne-franche-comte', ImportDossier)


init()
    .then(() => page.start())
    .catch(error => {
        console.error(error)
    })