import type { Knex } from "knex";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import { dossiersAccessibleToUser } from "../dossier/access.ts";
import { changeDossierAccess, recalculateAssignments } from "../../dossierRouting.ts";
import { shareDirectAccess } from "./access.ts";

async function requireWrite(ids: DossierId[], userId: UserId, trx: Knex.Transaction) {
  const access = await dossiersAccessibleToUser(ids, userId, trx);
  if (ids.some((id) => access.get(id) !== "complet"))
    throw new Error("Dossier inaccessible en écriture");
}

async function ensureProjet(id: DossierId, trx: Knex.Transaction): Promise<string> {
  const member = await trx("dossier_demande").where({ dossier: id }).first();
  if (member) return member.projet;
  const dossier = await trx("dossier").where({ id }).first("name");
  const [projet] = await trx("dossier_projet")
    .insert({ name: dossier.name || "Projet sans nom" })
    .returning("id");
  await trx("dossier_demande").insert({
    dossier: id,
    projet: projet.id,
    label: dossier.name || "Demande initiale",
  });
  return projet.id;
}

export function createDemande(
  dossierId: DossierId,
  label: string,
  userId: UserId,
  db: Knex,
): Promise<DossierId> {
  return changeDossierAccess(db, async (trx) => {
    await requireWrite([dossierId], userId, trx);
    const projet = await ensureProjet(dossierId, trx);
    const original = await trx("dossier").where({ id: dossierId }).first();
    // Seed project information only. A new procedure starts without an instruction or decisions.
    const columns = [
      "main_activite",
      "description",
      "communes",
      "departments",
      "regions",
      "location_scope",
      "primary_department",
      "projet_map",
    ];
    const copied = Object.fromEntries(
      columns.map((key) => [
        key,
        typeof original[key] === "object" && original[key] !== null
          ? JSON.stringify(original[key])
          : original[key],
      ]),
    );
    const [demande] = await trx("dossier")
      .insert({ ...copied, name: original.name, source: "pitchou", depot_date: null })
      .returning("id");
    await trx("dossier_demande").insert({ dossier: demande.id, projet, label: label.trim() });
    const overrides = await trx("dossier_group_override").where({ dossier: dossierId });
    if (overrides.length > 0)
      await trx("dossier_group_override").insert(
        overrides.map(({ groupe_instructeurs, mode, access_level }) => ({
          dossier: demande.id,
          groupe_instructeurs,
          mode,
          access_level,
        })),
      );
    await shareDirectAccess(demande.id, trx);
    await recalculateAssignments(trx, { dossiers: [demande.id] });
    return demande.id;
  });
}

export function linkDemande(
  dossierId: DossierId,
  otherId: DossierId,
  userId: UserId,
  db: Knex,
): Promise<void> {
  return changeDossierAccess(db, async (trx) => {
    await requireWrite([dossierId, otherId], userId, trx);
    if (dossierId === otherId) throw new Error("Cette demande appartient déjà au dossier");
    const existing = await trx("dossier_demande").where({ dossier: otherId }).first();
    if (existing) throw new Error("Cette demande appartient déjà à un dossier regroupé");
    const projet = await ensureProjet(dossierId, trx);
    const other = await trx("dossier").where({ id: otherId }).first("name");
    await trx("dossier_demande").insert({
      dossier: otherId,
      projet,
      label: other.name || `Demande ${otherId}`,
    });
    await shareDirectAccess(dossierId, trx);
    await recalculateAssignments(trx, { dossiers: [dossierId, otherId] });
  });
}
