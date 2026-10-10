import type { Knex } from "knex";
import { directDatabaseConnection } from "../../database.ts";
import { isDossierSource, type DossierSource } from "@pitchou/types/dossierSource.ts";
import type { DossierPhase } from "@pitchou/types/API_Pitchou.ts";
import type { default as Dossier, DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type File from "@pitchou/types/database/public/File.ts";
import type GroupeInstructeurs from "@pitchou/types/database/public/GroupeInstructeurs.ts";
import type { PorteurDeProjet } from "@pitchou/types/porteurDeProjet.ts";
import {
  joinPorteurDeProjet,
  porteurDeProjetColumns,
  withPorteurDeProjet,
} from "../dossier/porteur.ts";
import { DossierNotFoundError } from "./errors.ts";
import type { AdminDossierIdentite } from "./relationTypes.ts";

export type AdminPhaseHistoryEntry = {
  phase: DossierPhase;
  timestamp: Date;
  caused_by_email: string | null;
  demarche_numerique_agent_email: string | null;
};
export type AdminPieceJointe = Pick<
  File,
  "id" | "name" | "media_type" | "created_at" | "demarche_numerique_created_at"
> & { size: number | null };
export type AdminDossierDetail = {
  dossier: Dossier;
  source: DossierSource;
  managedByDn: boolean;
  phase: DossierPhase;
  porteur_de_projet: PorteurDeProjet | null;
  groupe: Pick<GroupeInstructeurs, "id" | "name"> | null;
  identites: AdminDossierIdentite[];
  evenementsPhase: AdminPhaseHistoryEntry[];
  piecesJointes: AdminPieceJointe[];
  especesImpactees: Pick<File, "id" | "name" | "media_type"> | null;
};

export async function getDossierDetailForAdmin(
  dossierId: DossierId,
  db: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<AdminDossierDetail> {
  const dossier: Dossier | undefined = await db("dossier")
    .select("*")
    .where({ id: dossierId })
    .first();
  if (!dossier) throw new DossierNotFoundError(dossierId);
  const [porteurRow, groupe, identites, evenementsPhase, piecesJointes, especesImpactees] =
    await Promise.all([
      joinPorteurDeProjet(db("dossier"))
        .select(porteurDeProjetColumns)
        .where("dossier.id", dossierId)
        .first(),
      db("edge_groupe_instructeurs__dossier")
        .select(["groupe_instructeurs.id", "groupe_instructeurs.name"])
        .join("groupe_instructeurs", {
          "groupe_instructeurs.id": "edge_groupe_instructeurs__dossier.groupe_instructeurs",
        })
        .where({ "edge_groupe_instructeurs__dossier.dossier": dossierId })
        .first(),
      db("identite_dossier").select("*").where({ dossier: dossierId }),
      db("evenement_phase_dossier")
        .select([
          "evenement_phase_dossier.phase",
          "evenement_phase_dossier.timestamp",
          "personne.email as caused_by_email",
          "evenement_phase_dossier.demarche_numerique_agent_email",
        ])
        .leftJoin("personne", { "personne.id": "evenement_phase_dossier.caused_by_personne" })
        .where({ dossier: dossierId })
        .andWhere(function () {
          this.whereNotNull("caused_by_personne").orWhereNotNull("demarche_numerique_agent_email");
        })
        .orderBy("timestamp", "desc"),
      db("edge_dossier__fichier_pieces_jointes_petitionnaire")
        .select([
          "file.id",
          "file.name",
          "file.media_type",
          db.raw("file.size::integer as size"),
          "file.created_at",
          "file.demarche_numerique_created_at",
        ])
        .join("file", { "file.id": "edge_dossier__fichier_pieces_jointes_petitionnaire.fichier" })
        .where({ "edge_dossier__fichier_pieces_jointes_petitionnaire.dossier": dossierId })
        .orderBy("file.created_at", "desc"),
      dossier.especes_impactees
        ? db("file")
            .select(["id", "name", "media_type"])
            .where({ id: dossier.especes_impactees })
            .first()
        : null,
    ]);
  const source: DossierSource = isDossierSource(dossier.source) ? dossier.source : "unknown";
  return {
    dossier,
    source,
    managedByDn: source === "demarche_numerique",
    phase: evenementsPhase[0]?.phase ?? "Accompagnement amont",
    porteur_de_projet: withPorteurDeProjet(porteurRow ?? {}).porteur_de_projet,
    groupe: groupe ?? null,
    identites,
    evenementsPhase,
    piecesJointes,
    especesImpactees: especesImpactees ?? null,
  };
}
