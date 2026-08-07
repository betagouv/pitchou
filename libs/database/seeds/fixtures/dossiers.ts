import { SEED_DOSSIERS_CHUNK_1 } from "./dossiers/dossiers-1.ts";
import { SEED_DOSSIERS_CHUNK_2 } from "./dossiers/dossiers-2.ts";
import { SEED_DOSSIERS_CHUNK_3 } from "./dossiers/dossiers-3.ts";
import { SEED_DOSSIERS_CHUNK_4 } from "./dossiers/dossiers-4.ts";
import { SEED_DOSSIERS_CHUNK_5 } from "./dossiers/dossiers-5.ts";
import { SEED_DOSSIERS_CHUNK_6 } from "./dossiers/dossiers-6.ts";
import { SEED_DOSSIERS_CHUNK_7 } from "./dossiers/dossiers-7.ts";
import { SEED_ENTREPRISES_CHUNK_1 } from "./dossiers/entreprises-1.ts";
import { SEED_PERSONNES_CHUNK_1 } from "./dossiers/personnes-1.ts";
import { SEED_DOSSIERS_SUIVIS_PAR_DEV_CHUNK_1 } from "./dossiers/dossiers-suivis-par-dev-1.ts";
import { SEED_ESPECES_IMPACTEES_CHUNK_1 } from "./dossiers/especes-impactees-1.ts";
import { SEED_EVENEMENTS_PHASE_DOSSIER_CHUNK_1 } from "./dossiers/evenements-phase-dossier-1.ts";
import { SEED_EVENEMENTS_PHASE_DOSSIER_CHUNK_2 } from "./dossiers/evenements-phase-dossier-2.ts";
import { SEED_AVIS_EXPERTS_CHUNK_1 } from "./dossiers/avis-experts-1.ts";
import { SEED_DECISIONS_ADMINISTRATIVES_CHUNK_1 } from "./dossiers/decisions-administratives-1.ts";
import { SEED_PRESCRIPTIONS_CHUNK_1 } from "./dossiers/prescriptions-1.ts";
import { SEED_PRESCRIPTIONS_CHUNK_2 } from "./dossiers/prescriptions-2.ts";
import { SEED_CONTROLES_CHUNK_1 } from "./dossiers/controles-1.ts";

import type {
  SeedAvisExpert,
  SeedControle,
  SeedDecisionAdministrative,
  SeedDossier,
  SeedEntreprise,
  SeedEspecesImpactees,
  SeedEvenementPhaseDossier,
  SeedPersonne,
  SeedPrescription,
} from "./dossiers/types.ts";

export const SEED_DOSSIERS: SeedDossier[] = [
  ...SEED_DOSSIERS_CHUNK_1,
  ...SEED_DOSSIERS_CHUNK_2,
  ...SEED_DOSSIERS_CHUNK_3,
  ...SEED_DOSSIERS_CHUNK_4,
  ...SEED_DOSSIERS_CHUNK_5,
  ...SEED_DOSSIERS_CHUNK_6,
  ...SEED_DOSSIERS_CHUNK_7,
];
export const SEED_ENTREPRISES: SeedEntreprise[] = [...SEED_ENTREPRISES_CHUNK_1];
export const SEED_PERSONNES: SeedPersonne[] = [...SEED_PERSONNES_CHUNK_1];
export const SEED_DOSSIERS_SUIVIS_PAR_DEV: string[] = [...SEED_DOSSIERS_SUIVIS_PAR_DEV_CHUNK_1];
export const SEED_ESPECES_IMPACTEES: SeedEspecesImpactees[] = [...SEED_ESPECES_IMPACTEES_CHUNK_1];
export const SEED_EVENEMENTS_PHASE_DOSSIER: SeedEvenementPhaseDossier[] = [
  ...SEED_EVENEMENTS_PHASE_DOSSIER_CHUNK_1,
  ...SEED_EVENEMENTS_PHASE_DOSSIER_CHUNK_2,
];
export const SEED_AVIS_EXPERTS: SeedAvisExpert[] = [...SEED_AVIS_EXPERTS_CHUNK_1];
export const SEED_DECISIONS_ADMINISTRATIVES: SeedDecisionAdministrative[] = [
  ...SEED_DECISIONS_ADMINISTRATIVES_CHUNK_1,
];
export const SEED_PRESCRIPTIONS: SeedPrescription[] = [
  ...SEED_PRESCRIPTIONS_CHUNK_1,
  ...SEED_PRESCRIPTIONS_CHUNK_2,
];
export const SEED_CONTROLES: SeedControle[] = [...SEED_CONTROLES_CHUNK_1];
