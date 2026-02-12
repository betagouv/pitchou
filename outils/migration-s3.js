import pLimit from 'p-limit';

import { closeDatabaseConnection, directDatabaseConnection } from '../scripts/server/database.js';
import { getFichier } from '../scripts/server/database/fichier.js';
import { ajouterFichier } from '../scripts/server/object-storage/fichier.js';
import { créerClient } from '../scripts/server/object-storage/config.js';

/** @import { default as Fichier } from '../scripts/types/database/public/Fichier.js' */

const s3Client = créerClient()

/**
 * @param {Fichier['id']} id
 */
async function migrerFichierVersS3(id) {
    console.log(`Migration fichier: ${id}`)
    const fichier = await getFichier(id)
    await ajouterFichier(fichier, s3Client)
    directDatabaseConnection('fichier')
        .update({taille: fichier.taille, contenu: null})
        .where({id})
}

const listeFichiers = await directDatabaseConnection.raw(`
    select id from fichier where id not in (
        select espèces_impactées from dossier where espèces_impactées is not null
    ) and contenu is not null;
`)

console.log(`Migration de ${listeFichiers.rowCount} fichiers`)

const limit = pLimit(6)

await Promise.all(listeFichiers.rows.map((/** @type {{id: Fichier['id']}} }} */ row) => {
    return limit(() => migrerFichierVersS3(row.id))
}))

await closeDatabaseConnection()
s3Client.destroy()
