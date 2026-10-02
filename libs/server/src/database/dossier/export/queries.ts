import type { Knex } from "knex";
import type { ExportDossier, ExportEspece } from "@pitchou/types/dossierExport.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type Prescription from "@pitchou/types/database/public/Prescription.ts";
import type Controle from "@pitchou/types/database/public/Controle.ts";
import { joinDossierIdentities } from "../fullColumns.ts";

export function exportDossiersQuery(
  ids: Knex.QueryBuilder,
  trx: Knex.Transaction,
): Promise<
  Omit<ExportDossier, "followers" | "especes" | "avis" | "decisions" | "prescriptions">[]
> {
  return joinDossierIdentities(
    trx("dossier").select([
      "dossier.id",
      "demarche_numerique_number",
      "dossier.name",
      "depot_date",
      "main_activite",
      "activite.label as activite_label",
      "primary_department",
      "communes",
      "departments",
      "regions",
      "location_scope",
      "demandeur_personne_physique.last_name as demandeur_personne_physique_last_name",
      "demandeur_personne_physique.first_names as demandeur_personne_physique_first_names",
      "demandeur_personne_morale.legal_name as demandeur_personne_morale_legal_name",
      "demandeur_personne_morale.siret as demandeur_personne_morale_siret",
      "linked_to_ae_regime",
      "ddep_required",
      "er_mesures_sufficient",
      "enjeu",
    ]),
  )
    .select(
      trx.raw(`coalesce((select phase from evenement_phase_dossier
      where evenement_phase_dossier.dossier = dossier.id
        and (caused_by_personne is not null or demarche_numerique_agent_email is not null)
      order by timestamp desc limit 1), 'Accompagnement amont') as phase`),
    )
    .whereIn("dossier.id", ids.clone())
    .orderBy("dossier.id");
}

export async function exportRelationsQueries(ids: Knex.QueryBuilder, trx: Knex.Transaction) {
  const followers = await trx("edge_personne_follows_dossier")
    .select<{ dossier: Dossier["id"]; email: string }[]>("dossier", "personne.email")
    .join("personne", "personne.id", "edge_personne_follows_dossier.personne")
    .whereIn("dossier", ids.clone())
    .whereNotNull("personne.email");
  const especes = await trx("impact_espece")
    .distinct<(ExportEspece & { dossier: Dossier["id"] })[]>(
      "dossier",
      "impact_espece.cd_ref",
      "noms_vernaculaires",
      "noms_scientifiques",
      "espece_cnpn",
      "espece_ministerielle",
    )
    .leftJoin("espece_protegee", "espece_protegee.cd_ref", "impact_espece.cd_ref")
    .whereIn("dossier", ids.clone());
  const avis = await trx("avis_expert")
    .select<(ExportDossier["avis"][number] & { dossier: Dossier["id"] })[]>(
      "dossier",
      "expert",
      "saisine_date",
      "saisine_fichier",
      "avis_date",
      "avis_fichier",
      "avis",
    )
    .whereIn("dossier", ids.clone());
  const decisions = await trx("decision_administrative")
    .select<(ExportDossier["decisions"][number] & { dossier: Dossier["id"] })[]>(
      "dossier",
      "number",
      "type",
      "signature_date",
    )
    .whereIn("dossier", ids.clone())
    .orderBy("signature_date")
    .orderBy("id");
  const prescriptions = await trx("prescription")
    .select<{ id: Prescription["id"]; dossier: Dossier["id"] }[]>(
      "prescription.id",
      "decision_administrative.dossier",
    )
    .join(
      "decision_administrative",
      "decision_administrative.id",
      "prescription.decision_administrative",
    )
    .whereIn("decision_administrative.dossier", ids.clone());
  const controles = await trx("controle")
    .select<Pick<Controle, "prescription" | "controle_date" | "result">[]>(
      "controle.prescription",
      "controle_date",
      "result",
    )
    .join("prescription", "prescription.id", "controle.prescription")
    .join(
      "decision_administrative",
      "decision_administrative.id",
      "prescription.decision_administrative",
    )
    .whereIn("decision_administrative.dossier", ids.clone())
    .orderBy("controle.id");
  return { followers, especes, avis, decisions, prescriptions, controles };
}
