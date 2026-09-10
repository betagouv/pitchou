import type { Knex } from "knex";

type SeedAction = {
  /** demarche_numerique_number of the dossier */
  dossier: string;
  type: string;
  data: Record<string, unknown>;
  /** Days before the seeding date */
  daysAgo: number;
  /** By the pétitionnaire (the form platform) rather than by an instructeur */
  petitionnaire?: boolean;
};

/**
 * Enough historique to review the Historique tab and the « Nouvelles modifications »
 * badges of the Détail du projet: recent pétitionnaire changes on two dossiers, plus
 * a few instructeur actions further back.
 */
const SEED_ACTIONS: SeedAction[] = [
  // D2 — dossier at the arrêté signature: the pétitionnaire kept completing it.
  {
    dossier: "99000002",
    type: "champ_modifie",
    data: { field: "Description" },
    daysAgo: 2,
    petitionnaire: true,
  },
  {
    dossier: "99000002",
    type: "champ_modifie",
    data: { field: "Date de fin d'intervention ou des travaux" },
    daysAgo: 2,
    petitionnaire: true,
  },
  { dossier: "99000002", type: "especes_renseignees", data: {}, daysAgo: 1, petitionnaire: true },
  { dossier: "99000002", type: "phase_renseignee", data: { value: "Instruction" }, daysAgo: 40 },
  {
    dossier: "99000002",
    type: "prochaine_action_attendue_renseignee",
    data: { value: "Signer l'arrêté" },
    daysAgo: 5,
  },

  // D5 — dossier in accompagnement amont, waiting on the pétitionnaire.
  {
    dossier: "99000005",
    type: "champ_modifie",
    data: { field: "Mandataire" },
    daysAgo: 3,
    petitionnaire: true,
  },
  {
    dossier: "99000005",
    type: "piece_jointe_importee",
    data: { name: "protocole-transport-2026.pdf" },
    daysAgo: 3,
    petitionnaire: true,
  },
  { dossier: "99000005", type: "echeance_renseignee", data: { value: null }, daysAgo: 12 },

  // D6 — waiting for the CNPN avis, saisine sent by the instructeur.
  { dossier: "99000006", type: "saisine_importee", data: {}, daysAgo: 25 },
  { dossier: "99000006", type: "phase_renseignee", data: { value: "Instruction" }, daysAgo: 60 },
];

export async function seedActionsDossier(
  transaction: Knex.Transaction,
  dossierIdMap: Record<string, number>,
  instructeurPersonneId: number | null,
) {
  for (const { dossier: dsNumber, type, data, daysAgo, petitionnaire } of SEED_ACTIONS) {
    const dossierId = dossierIdMap[dsNumber];
    if (!dossierId) {
      console.warn(`  ⚠ action "${type}" — dossier DS ${dsNumber} non résolu`);
      continue;
    }

    const existing = await transaction("action_dossier")
      .where({ dossier: dossierId, type })
      .first();
    if (existing) continue;

    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    await transaction("action_dossier").insert({
      dossier: dossierId,
      type,
      data: JSON.stringify(data),
      created_at: createdAt,
      author_petitionnaire: !!petitionnaire,
      author_personne: petitionnaire ? null : instructeurPersonneId,
    });
  }
}
