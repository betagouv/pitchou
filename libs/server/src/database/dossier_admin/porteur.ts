import type { Knex } from "knex";
import { isOrganisation } from "@pitchou/common/organisation.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type {
  PorteurDeProjetOrganisation,
  PorteurDeProjetPersonneMorale,
} from "@pitchou/types/porteurDeProjet.ts";
import { audit } from "../../administration/audit.ts";
import { savePorteursDeProjet } from "../porteur_de_projet.ts";
import {
  joinPorteurDeProjet,
  porteurDeProjetColumns,
  withPorteurDeProjet,
} from "../dossier/porteur.ts";
import { DossierManagedByDnError, DossierNotFoundError } from "./errors.ts";

export type AdminPorteurUpdate =
  | PorteurDeProjetOrganisation
  | Pick<PorteurDeProjetPersonneMorale, "type" | "siret">;

export class DossierPorteurReadOnlyError extends Error {
  constructor(dossierId: DossierId) {
    super(`Le porteur du dossier ${dossierId} ne peut pas être modifié depuis l'administration.`);
    this.name = "DossierPorteurReadOnlyError";
  }
}

/** Changes only the porteur. Imported contacts and legacy identities remain attached. */
export async function updatePorteurFromAdmin(
  dossierId: DossierId,
  porteur: AdminPorteurUpdate,
  actor: UserId,
  trx: Knex.Transaction,
): Promise<void> {
  const dossier = await trx("dossier").where({ id: dossierId }).first("source").forUpdate();
  if (!dossier) throw new DossierNotFoundError(dossierId);
  if (dossier.source === "demarche_numerique")
    throw new DossierManagedByDnError(dossierId, ["porteur_de_projet"]);
  if (dossier.source !== "onagre" && dossier.source !== "pitchou")
    throw new DossierPorteurReadOnlyError(dossierId);
  if (
    !(
      isOrganisation(porteur) ||
      (porteur.type === "personne_morale" &&
        typeof porteur.siret === "string" &&
        /^[0-9]{14}$/u.test(porteur.siret))
    )
  )
    throw new TypeError("Invalid organisation or SIRET porteur de projet");

  const before = withPorteurDeProjet(
    await joinPorteurDeProjet(trx("dossier"))
      .where("dossier.id", dossierId)
      .select(porteurDeProjetColumns)
      .first(),
  ).porteur_de_projet;
  await savePorteursDeProjet(new Map([[dossierId, porteur]]), trx);
  await audit(trx, actor, "dossier_porteur_saved", { dossier: dossierId, before, after: porteur });
}
