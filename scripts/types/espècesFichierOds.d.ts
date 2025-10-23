/**
 * Ce fichier documente les objets récupérés après un parsing de fichier ods exporté
 * depuis /saisie-espèces
 *
 */

import { FauneNonOiseauAtteinte, FloreAtteinte, OiseauAtteint } from "./especes";

export type FichierEspècesImpactéesOds_V1 =
    Map<'oiseau', OiseauAtteintOds_V1[]> &
    Map<'faune non-oiseau', FauneNonOiseauAtteinteOds_V1[]> &
    Map<'faune_non-oiseau', FauneNonOiseauAtteinteOds_V1[]> & // Des fois, nous recevons des feuilles avec le nom faune_non-oiseau
    Map<'flore', FloreAtteinteOds_V1[]> &
    Map<'metadata', MetadataOds_V1>

interface EtreVivantAtteintOds_V1{
    CD_REF: string,
    "nombre individus": string,
    "surface habitat détruit": number,
    "code activité": string,
    "identifiant pitchou activité"?: string, // cette propriété a été ajoutée en version 1.1.0
}

export interface OiseauAtteintOds_V1 extends EtreVivantAtteintOds_V1{
    nids: number
    œufs: number,
    "code méthode": string,
    "code transport": string
}

export interface FauneNonOiseauAtteinteOds_V1 extends EtreVivantAtteintOds_V1{
    "code méthode": string,
    "code transport": string
}

export interface FloreAtteinteOds_V1 extends EtreVivantAtteintOds_V1{}

export interface MetadataOds_V1{
    'version fichier': string
    'version TaxRef': string
    'schema rapportage européen': string
}
