import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import { getAvisExpertFilesByCap } from "../avis_expert.ts";
import { getDecisionsAdministratives } from "../decision_administrative.ts";
import { getLatestEvenementsPhaseDossiers } from "./access.ts";
import type CapDossier from "@pitchou/types/database/public/CapDossier.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type EvenementPhaseDossier from "@pitchou/types/database/public/EvenementPhaseDossier.ts";
import type { DossierSummary, FrontEndDecisionAdministrative } from "@pitchou/types/API_Pitchou.ts";

const columns = [
  "dossier.id as id",
  "demarche_numerique_number",
  "depot_date",
  "dossier.name as name",
  "linked_to_ae_regime",
  "main_activite",
  "source",
  "departments",
  "communes",
  "regions",
  "location_scope",
  "primary_department",
  "next_action_expected_from",
  "identite_demandeur.last_name as deposant_last_name",
  "identite_demandeur.first_names as deposant_first_names",
  "demandeur_personne_physique.last_name as demandeur_personne_physique_last_name",
  "demandeur_personne_physique.first_names as demandeur_personne_physique_first_names",
  "demandeur_personne_morale.siret as demandeur_personne_morale_siret",
  "demandeur_personne_morale.legal_name as demandeur_personne_morale_legal_name",
  "enjeu",
  "free_comment",
  "onagre_demande_identifier",
] as (keyof DossierSummary)[];

export async function getDossiersSummariesByCap(
  cap: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierSummary[]> {
  const transaction: Knex.Transaction = databaseConnection.isTransaction
    ? (databaseConnection as Knex.Transaction)
    : await databaseConnection.transaction({ readOnly: true });
  const dossiersP: Promise<DossierSummary[]> = transaction("dossier")
    .select(columns)
    .select(
      transaction.raw('dossier."especes_impactees" is not null as "especesImpacteesRenseignees"'),
    )
    .join("edge_groupe_instructeurs__dossier", {
      "edge_groupe_instructeurs__dossier.dossier": "dossier.id",
    })
    .join("edge_cap_dossier__groupe_instructeurs", {
      "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs":
        "edge_groupe_instructeurs__dossier.groupe_instructeurs",
    })
    .leftJoin("identite_dossier as identite_demandeur", function () {
      this.on("identite_demandeur.dossier", "dossier.id").andOnVal(
        "identite_demandeur.type",
        "demandeur",
      );
    })
    .leftJoin("personne as demandeur_personne_physique", {
      "demandeur_personne_physique.id": "dossier.demandeur_personne_physique",
    })
    .leftJoin("entreprise as demandeur_personne_morale", {
      "demandeur_personne_morale.siret": "dossier.demandeur_personne_morale",
    })
    .where({ "edge_cap_dossier__groupe_instructeurs.cap_dossier": cap });
  const eventsP = getLatestEvenementsPhaseDossiers(cap, transaction);
  const decisionsP = getDecisionsAdministratives(cap, transaction);
  const avisP = getAvisExpertFilesByCap(cap, transaction);
  const result = Promise.all([dossiersP, eventsP, decisionsP, avisP]).then(
    ([dossiers, events, decisions, avis]) => {
      const eventByDossier = new Map<Dossier["id"], EvenementPhaseDossier>(
        events.map((event) => [event.dossier, event]),
      );
      for (const dossier of dossiers) {
        const event = eventByDossier.get(dossier.id);
        dossier.phase = event?.phase ?? "Accompagnement amont";
        dossier.phase_start_date = event?.timestamp ?? dossier.depot_date;
      }
      const decisionsByDossier = new Map<Dossier["id"], FrontEndDecisionAdministrative[]>();
      for (const decision of decisions) {
        const values = decisionsByDossier.get(decision.dossier) || [];
        values.push(decision);
        decisionsByDossier.set(decision.dossier, values);
      }
      for (const dossier of dossiers) {
        const values = decisionsByDossier.get(dossier.id);
        if (values) dossier.decisionsAdministratives = values;
      }
      const avisByDossier = new Map<Dossier["id"], DossierSummary["avisExperts"]>();
      for (const { dossier, expert, hasSaisineFile, hasAvisFile } of avis) {
        const values = avisByDossier.get(dossier) ?? [];
        values.push({ expert, hasSaisineFile, hasAvisFile });
        avisByDossier.set(dossier, values);
      }
      for (const dossier of dossiers) dossier.avisExperts = avisByDossier.get(dossier.id) ?? [];
      return dossiers;
    },
  );
  if (!databaseConnection.isTransaction) {
    Promise.all([dossiersP, eventsP, decisionsP, avisP])
      .then(transaction.commit)
      .catch(transaction.rollback);
  }
  return result;
}
