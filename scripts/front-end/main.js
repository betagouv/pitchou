//@ts-check
import './before-ses-lockdown.js'

import page from 'page'

import Accueil from './routes/Accueil.js'
import Dossier from './routes/Dossier.js';
import SaisieEspèces from './routes/SaisieEspèces.js';
import PreremplissageDerogation from './routes/PreremplissageDerogation.js';
import TmpStats from './routes/TmpStats.js';
import ImportDossierBFC from './routes/importDossierBFC.js';
import ImportDossierCorse from './routes/importDossierCorse.js';
import Accessibilite from './routes/Accessibilite.js';
import DonnéesPersonnelles from './routes/DonnéesPersonnelles.js'; 
import AARRI from './routes/AARRI.js';

import { init } from './actions/main.js';
import Stats from './routes/Stats.js';
import TousLesDossiers from './routes/TousLesDossiers.js';

// Évite l'appel du routeur sur les liens dont le chemain est le même que la page courante mais l'ancre (#) est différente
page((ctx, next) => {
    if (!ctx.init && ctx.hash && ctx.path === window.location.pathname) {
        return
    }
    next()
})

page('/', Accueil)

page('/tous-les-dossiers', TousLesDossiers)

page('/dossier/:dossierId', Dossier)

page('/saisie-especes', SaisieEspèces)
page('/preremplissage-derogation', PreremplissageDerogation)
page('/tmp/stats', TmpStats)
page('/stats', Stats)
page('/import-dossier-historique/bourgogne-franche-comte', ImportDossierBFC)
page('/import-dossier-historique/corse', ImportDossierCorse)
page('/accessibilite', Accessibilite)
page('/donnees-personnelles', DonnéesPersonnelles)
page('/aarri', AARRI)


init()
    .then(() => page.start())
    .catch(error => {
        console.error(`Erreur à l'initialisation`, error)
    })
