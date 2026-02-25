/** @import {S3Client} from '@aws-sdk/client-s3' */
/** @import {default as Fichier} from '../../types/database/public/Fichier.ts' */
/** @import {Options as RetryOptions} from 'p-retry'*/

import { DeleteObjectsCommand, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import pRetry from 'p-retry'

import { créerClient, BUCKET_NAME } from './config.js'


/** @type {RetryOptions} */
const retryOptions = {
    retries: 2,
    onFailedAttempt: ({error}) => {
        console.warn(`Failed S3 operation, retring… ${error}`);
    },
}

/**
 * @param {Promise<any>} promise
 * @returns {Promise<any>}
 */
function withRetry(promise) {
    return pRetry(() => promise, retryOptions)
}

/**
 *
 * @param {Partial<Fichier>} fichier
 * @param {S3Client | undefined} client
 */
export async function ajouterFichier(fichier, client = undefined) {
    let nouveauClient = false
    if (!client) {
        nouveauClient = true
    }
    const s3 = client ? client : créerClient()

    if (fichier.contenu === undefined || fichier.contenu === null) {
        throw new Error('Fichier vide')
    }

    const body = fichier.contenu;

    await withRetry(s3.send(new PutObjectCommand({
        'Body': body,
        'Bucket': BUCKET_NAME,
        'Key': `fichiers/${fichier.id}`,
    })))

    if (nouveauClient) {
        s3.destroy()
    }
}

/**
 * @param {Partial<Fichier>} fichier
 * @param {S3Client | undefined} client
 */
export async function supprimerFichier(fichier, client = undefined) {
    let nouveauClient = false
    if (!client) {
        nouveauClient = true
    }
    const s3 = client ? client : créerClient()

    await withRetry(s3.send(new DeleteObjectCommand({
        'Bucket': BUCKET_NAME,
        'Key': `fichiers/${fichier.id}`,
    })))

    if (nouveauClient) {
        s3.destroy()
    }
}

/**
 * @param {Partial<Fichier>[]} fichiers
 * @param {S3Client | undefined} client
 */
export async function supprimerFichiers(fichiers, client = undefined) {
    let nouveauClient = false
    if (!client) {
        nouveauClient = true
    }
    const s3 = client ? client : créerClient()

    const promises = [];
    let chunk = fichiers.slice(0, 1000)
    let fichiersRestants = fichiers.slice(1000)

    do {
        const command = withRetry(s3.send(new DeleteObjectsCommand({
            Bucket: BUCKET_NAME,
            Delete: {
                Objects: chunk.map(fichier => { return {
                    Key: `fichiers/${fichier.id}`
                }})
            }
        })))

        promises.push(command)

        chunk = fichiersRestants.slice(0, 1000)
        fichiersRestants = fichiersRestants.slice(1000)
    } while (fichiersRestants.length > 0)

    await Promise.all(promises)

    if (nouveauClient) {
        s3.destroy()
    }
}

/**
 * @param {Partial<Fichier>} fichier
 * @param {number} expiration
 * @param {S3Client | undefined} client
 * @returns {Promise<string>}
 */
export async function getFichierUrl(fichier, expiration = 3600, client = undefined) {
    let nouveauClient = false
    if (!client) {
        nouveauClient = true
    }
    const s3 = client ? client : créerClient()

    const url = await getSignedUrl(s3, new GetObjectCommand({
        'Bucket': BUCKET_NAME,
        'Key': `fichiers/${fichier.id}`,
        'ResponseContentType': fichier.media_type || undefined,
        'ResponseContentDisposition': fichier.nom ? `attachment; filename="${fichier.nom}"` : undefined,
    }), {expiresIn: expiration })

    if (nouveauClient) {
        s3.destroy()
    }

    return url
}
