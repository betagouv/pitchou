//@ts-check

import { promisify } from 'node:util';
import child_process from 'node:child_process'

const exec = promisify(child_process.exec);

/*

Parfois, après certaines migrations de base de données, il est nécessaire de faire une 
synchronisation complètes des données de DS
Et parfois, le manque de cette synchronisation va empêcher complètement d'afficher pitchou

Alors, il y a une fonction qui est appelée systématiquement qui lance de manière 
conditionnelle une synchronisation complète
La condition est une condition de date. Tous les déploiements qui ont lieu avant cette 
date produisent une synchronisation complète

Quand une migration nécessite une synchronisation complète, changer la 
DATE_SYNCHRONISATION_COMPLÈTE pour y mettre une date dans le futur (le lendemain, par exemple)

Passée cette date, tous les déploiements ne produiront pas de synchronisation complète
Avant un déploiement qui ne nécessite pas de synchronisation complète, il est possible de 
remettre une date dans le passé

*/

const DATE_SYNCHRONISATION_COMPLÈTE = '2025-05-24'

export default async function(){
    if((new Date()).getTime() < new Date(DATE_SYNCHRONISATION_COMPLÈTE).getTime()){
        console.log(`Lancement d'une synchronisation complète (date actuelle antérieure à ${DATE_SYNCHRONISATION_COMPLÈTE})`)
        return exec('node outils/sync-démarches-simplifiées-88444.js --lastModified 2024-01-01')
            .then(({stdout, stderr}) => {
                console.log(`Sorties du process de synchronisation complète`)
                
                console.log('stdout:')
                console.log(stdout)
                
                console.log('stderr:')
                console.log(stderr)
            })
            .catch(err => {
                console.error(`Erreur du process de synchronisation complète`)
                console.error(err)
            })
    }
}