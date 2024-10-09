// @generated
// This file is automatically generated by Kanel. Do not modify manually.

import { type DossierId } from './Dossier';

/** Identifier type for public.message */
export type MessageId = string & { __brand: 'MessageId' };

/** Represents the table public.message */
export default interface Message {
  id: MessageId;

  contenu: string | null;

  date: Date | null;

  email_expéditeur: string | null;

  id_démarches_simplifiées: string | null;

  dossier: DossierId | null;
}

/** Represents the initializer for the table public.message */
export interface MessageInitializer {
  /** Default value: gen_random_uuid() */
  id?: MessageId;

  contenu?: string | null;

  date?: Date | null;

  email_expéditeur?: string | null;

  id_démarches_simplifiées?: string | null;

  dossier?: DossierId | null;
}

/** Represents the mutator for the table public.message */
export interface MessageMutator {
  id?: MessageId;

  contenu?: string | null;

  date?: Date | null;

  email_expéditeur?: string | null;

  id_démarches_simplifiées?: string | null;

  dossier?: DossierId | null;
}