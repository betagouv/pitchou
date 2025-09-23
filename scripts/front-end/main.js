//@ts-check
import './before-ses-lockdown.js'

import page from 'page'

import Accueil from './routes/Accueil.js'
import Dossier from './routes/Dossier.js';
import SaisieEspèces from './routes/SaisieEspèces.js';
import PreremplissageDerogation from './routes/PreremplissageDerogation.js';
import TmpStats from './routes/TmpStats.js';
import ImportDossierBFC from './routes/importDossierBFC.js';

import { init } from './actions/main.js';
import Stats from './routes/Stats.js';

// Évite l'appel du routeur sur les liens dont le chemain est le même que la page courante mais l'ancre (#) est différente
page((ctx, next) => {
    console.log(ctx)
    if (!ctx.init && ctx.hash && ctx.path === window.location.pathname) {
        return
    }
    next()
})

page('/', Accueil)

page('/dossier/:dossierId', Dossier)

page('/saisie-especes', SaisieEspèces)
page('/preremplissage-derogation', PreremplissageDerogation)
page('/tmp/stats', TmpStats)
page('/stats', Stats)
page('/import-dossier-historique/bourgogne-franche-comte', ImportDossierBFC)


init()
    .then(() => page.start())
    .catch(error => {
        console.error(`Erreur à l'initialisation`, error)
    })
