/**
 * This file documents the objects obtained after parsing an ods file exported
 * from /saisie-espèces
 *
 */

import { FauneNonOiseauAtteinte, FloreAtteinte, OiseauAtteint } from "./especes";

export type FichierEspecesImpacteesOds_V1 = Map<"oiseau", OiseauAtteintOds_V1[]> &
  Map<"faune non-oiseau", FauneNonOiseauAtteinteOds_V1[]> &
  Map<"faune_non-oiseau", FauneNonOiseauAtteinteOds_V1[]> & // Sometimes we receive sheets with the name faune_non-oiseau
  Map<"flore", FloreAtteinteOds_V1[]> &
  Map<"metadata", MetadataOds_V1>;

interface EtreVivantAtteintOds_V1 {
  CD_REF: string;
  "nombre individus": string;
  "surface habitat détruit": number;
  "code activité": string;
  "identifiant pitchou activité"?: string; // this property was added in version 1.1.0
}

export interface OiseauAtteintOds_V1 extends EtreVivantAtteintOds_V1 {
  nids: number;
  œufs: number;
  "code méthode": string;
  "code transport": string;
}

export interface FauneNonOiseauAtteinteOds_V1 extends EtreVivantAtteintOds_V1 {
  "code méthode": string;
  "code transport": string;
}

export interface FloreAtteinteOds_V1 extends EtreVivantAtteintOds_V1 {}

export interface MetadataOds_V1 {
  "version fichier": string;
  "version TaxRef": string;
  "schema rapportage européen": string;
}
