import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import type ActionDossier from "@pitchou/types/database/public/ActionDossier.ts";
import type { ActionDossierInitializer } from "@pitchou/types/database/public/ActionDossier.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type Prescription from "@pitchou/types/database/public/Prescription.ts";
import type { EvenementMetrique } from "@pitchou/types/evenement.d.ts";

/** An action as served to the front, its author identified by email. */
export type ActionDossierView = Pick<
  ActionDossier,
  "id" | "type" | "data" | "created_at" | "author_petitionnaire"
> & {
  author_email: string | null;
};

/**
 * Records actions in a dossier's historique. Fire-and-forget shape: callers
 * pass fully-built rows; an empty list is a no-op.
 */
export async function logActionsDossier(
  actions: ActionDossierInitializer[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  if (actions.length === 0) return;
  await databaseConnection("action_dossier").insert(
    // JSON columns must be serialized for insertion.
    actions.map((action) => ({ ...action, data: JSON.stringify(action.data ?? {}) })),
  );
}

/**
 * Acts that are both a fact of the dossier and a usage metric. The historique is
 * written server-side, inside the transaction that performs the change, so the
 * metric is derived from it instead of being reported a second time by the
 * browser — two reports of the same act could disagree.
 *
 * Acts whose metric carries context only the browser knows (which tab a modal was
 * opened from, the filters of a search) stay on the client side.
 */
const metricByActionType: Record<string, (action: ActionDossierInitializer) => EvenementMetrique> =
  {
    phase_renseignee: () => ({ type: "changerPhase" }),
    prochaine_action_renseignee: () => ({ type: "changerProchaineActionAttendueDe" }),
    prochaine_action_attendue_renseignee: () => ({ type: "changerProchaineActionAttendue" }),
    echeance_renseignee: () => ({ type: "changerDateProchaineEcheance" }),
    commentaire_ajoute: () => ({ type: "modifierCommentaireInstruction" }),
    commentaire_modifie: () => ({ type: "modifierCommentaireInstruction" }),
    dossier_suivi: ({ dossier }) => ({
      type: "suivreUnDossier",
      details: { dossierId: dossier as number },
    }),
    decision_importee: () => ({ type: "ajouterDécisionAdministrative" }),
    decision_modifiee: () => ({ type: "modifierDécisionAdministrative" }),
    decision_supprimee: () => ({ type: "supprimerDécisionAdministrative" }),
    avis_importe: () => ({ type: "ajouterAvisExpert" }),
    avis_modifie: () => ({ type: "modifierAvisExpert" }),
    avis_supprime: () => ({ type: "supprimerAvisExpert" }),
    prescription_ajoutee: () => ({ type: "ajouterPrescription" }),
    prescription_modifiee: () => ({ type: "modifierPrescription" }),
    prescription_supprimee: () => ({ type: "supprimerPrescription" }),
    controle_ajoute: () => ({ type: "ajouterContrôle" }),
    controle_modifie: () => ({ type: "modifierContrôle" }),
    controle_supprime: () => ({ type: "supprimerContrôle" }),
    document_genere: () => ({ type: "générerUnDocument" }),
    controle_retour_conformite: ({ data }) => ({
      type: "retourÀLaConformité",
      details: {
        prescription: ((data as { prescription?: string })?.prescription ??
          "") as Prescription["id"],
      },
    }),
  };

/**
 * Records actions in the historique and, for the acts above, the matching usage
 * metric. Actions of the pétitionnaire or of the synchronization have no author
 * personne: they are facts of the dossier, never product usage.
 *
 * `metricOverride` replaces the derived metrics with a single event, for an
 * endpoint whose batch of actions is one act for the user (assigning several
 * followers at once); pass `null` to record no metric at all.
 */
export async function logDossierActions(
  actions: ActionDossierInitializer[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
  metricOverride?: EvenementMetrique | null,
): Promise<void> {
  if (actions.length === 0) return;
  await logActionsDossier(actions, databaseConnection);

  const authors = new Set(
    actions.map(({ author_personne }) => author_personne).filter((id) => id != null),
  );
  if (metricOverride === null || authors.size === 0) return;

  const events =
    metricOverride !== undefined
      ? [...authors].map((personne) => ({ personne, event: metricOverride }))
      : actions
          .filter(({ author_personne }) => author_personne != null)
          .flatMap((action) => {
            const event = metricByActionType[action.type]?.(action);
            return event ? [{ personne: action.author_personne!, event }] : [];
          });
  if (events.length === 0) return;

  await databaseConnection("evenement_metrique").insert(
    events.map(({ personne, event }) => ({
      personne,
      evenement: event.type,
      details: "details" in event ? event.details : null,
    })),
  );
}

/**
 * Writes the historique of a change already committed. The historique is a record
 * of what happened, not part of the change itself: reporting the whole request as
 * failed because it could not be written would make the browser retry a write that
 * did go through — and none of these endpoints is idempotent.
 */
export async function logDossierActionsAfterCommit(
  /** Awaited here, so building the actions is covered too — it may read the database. */
  actions: ActionDossierInitializer[] | Promise<ActionDossierInitializer[]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
  metricOverride?: EvenementMetrique | null,
): Promise<void> {
  let resolved: ActionDossierInitializer[] = [];
  try {
    resolved = await actions;
    await logDossierActions(resolved, databaseConnection, metricOverride);
  } catch (error) {
    // Logged with the actions: they are the only trace left of what the historique
    // is missing.
    console.error(`Échec de l'écriture de l'historique du dossier`, resolved, error);
  }
}

export async function getDossierActions(
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<ActionDossierView[]> {
  return databaseConnection("action_dossier")
    .leftJoin("personne", { "personne.id": "action_dossier.author_personne" })
    .select([
      "action_dossier.id",
      "action_dossier.type",
      "action_dossier.data",
      "action_dossier.created_at",
      "action_dossier.author_petitionnaire",
      "personne.email as author_email",
    ])
    .where({ "action_dossier.dossier": dossierId })
    .orderBy("action_dossier.created_at", "desc");
}
