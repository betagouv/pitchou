/** @import {default as Fichier} from '../../types/database/public/Fichier.ts' */

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { créerClient, BUCKET_NAME } from './config.js'


/**
 *
 * @param {Partial<Fichier>} fichier
 * @return {Promise<number | undefined>}
 */
export function ajouterFichier(fichier) {
    const s3 = créerClient()

    if (fichier.contenu === undefined || fichier.contenu === null) {
        throw new Error('Fichier vide')
    }

    return s3.send(new PutObjectCommand({
        'Body': fichier.contenu,
        'Bucket': BUCKET_NAME,
        'Key': fichier.id,
    })).then(output => output.Size);
}

/**
 *
 * @param {Partial<Fichier>} fichier
 */
export function supprimerFichier(fichier) {
    const s3 = créerClient()

    return s3.send(new DeleteObjectCommand({
        'Bucket': BUCKET_NAME,
        'Key': fichier.id,
    }));
}

/**
 *
 * @param {Partial<Fichier>} fichier
 * @param {number} expiration
 * @returns {Promise<string>}
 */
export function getFichierUrl(fichier, expiration = 3600) {
    const s3 = créerClient()

    return getSignedUrl(s3, new GetObjectCommand({
        'Bucket': BUCKET_NAME,
        'Key': fichier.id,
        'ResponseContentType': fichier.media_type || undefined,
        'ResponseContentDisposition': fichier.nom ? `attachment; filename="${fichier.nom}"` : undefined,
    }), {expiresIn: expiration })
}
