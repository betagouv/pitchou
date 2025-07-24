//@ts-check

import {  subtle } from "node:crypto";
import { Buffer } from "node:buffer";

const algorithm = { name: 'AES-GCM', iv: Buffer.from('000000000000') } // AES-GCM est un Algorithme de chiffrement symétrique, ignorer la valeur de 'iv'

const keyData = process.env.KEY_CHIFFREMENT_DONNEES_INSTRUCTIONS_DOSSIER

const encoding = 'utf-8'

if (!keyData) {
    throw new Error(`Variable d'environnement KEY_CHIFFREMENT_DONNEES_INSTRUCTIONS_DOSSIER manquante`)
}

const key = await subtle.importKey('raw', Buffer.from(keyData.slice(0, 32)), algorithm, false, ['decrypt','encrypt'])


/**
 * @param {string} donnéesSupplémentaires
 * @returns {Promise<string>}
 */
export async function chiffrerDonnéesSupplémentairesDossiers(donnéesSupplémentaires) {
    const donnéesChiffrées = await subtle.encrypt(algorithm, key, Buffer.from(donnéesSupplémentaires, encoding))

    // Pour fournir des données qui se remplissent bien dans un champ texte sur DS, on restreint les caractères en choisissant 'base64'
    return Buffer.from(donnéesChiffrées).toString('base64')
}

/**s
 * @param {string} donnéesSupplémentairesChiffrées
 * @returns {Promise<string>}
 */
export async function déchiffrerDonnéesSupplémentairesDossiers(donnéesSupplémentairesChiffrées) {
    const donnéesSupplémentaires = await subtle.decrypt(algorithm, key, Buffer.from(donnéesSupplémentairesChiffrées, 'base64'))
    
    return Buffer.from(donnéesSupplémentaires).toString(encoding) 
}