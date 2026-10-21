import type { Knex } from "knex";

type Identite = {
  dossier: number;
  type: "demandeur" | "mandataire" | "representant";
  last_name: string | null;
  first_names: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
};

/**
 * Fills dossier_acteur from identite_dossier for the dossiers that do not come from
 * Démarche Numérique, since the resync only fills the others. Same rules as the admin:
 * the mandataire is the déposant; without mandataire, the déposant is the porteur
 * personne physique, or the demandeur identity; the représentant is the personne contact.
 * Dossiers that already have acteurs are left untouched.
 */
export async function up(knex: Knex) {
  const dossiers: { id: number; porteur: number | null }[] = await knex("dossier")
    .leftJoin("porteur_de_projet", "porteur_de_projet.id", "dossier.porteur_de_projet")
    .select("dossier.id", "porteur_de_projet.personne_physique as porteur")
    .whereNot("dossier.source", "demarche_numerique")
    .whereNotExists(knex("dossier_acteur").whereRaw("dossier_acteur.dossier = dossier.id"));
  const identites: Identite[] = await knex("identite_dossier").whereIn(
    "dossier",
    dossiers.map(({ id }) => id),
  );

  const insertPersonne = async ({ last_name, first_names, email, phone, role }: Identite) => {
    const [{ id }] = await knex("personne_physique")
      .insert({
        last_name: last_name || null,
        first_names: first_names || null,
        email: email || null,
        phone: phone || null,
        role: role || null,
      })
      .returning("id");
    return id as number;
  };

  for (const { id: dossier, porteur } of dossiers) {
    const identite = (type: Identite["type"]) =>
      identites.find((item) => item.dossier === dossier && item.type === type);
    const mandataire = identite("mandataire");
    const demandeur = identite("demandeur");
    const representant = identite("representant");
    const rows: { dossier: number; involvement: string; personne_physique: number }[] = [];
    if (mandataire) {
      const personne = await insertPersonne(mandataire);
      rows.push(
        { dossier, involvement: "mandataire", personne_physique: personne },
        { dossier, involvement: "deposant", personne_physique: personne },
      );
    } else if (porteur) {
      rows.push({ dossier, involvement: "deposant", personne_physique: porteur });
    } else if (demandeur) {
      rows.push({
        dossier,
        involvement: "deposant",
        personne_physique: await insertPersonne(demandeur),
      });
    }
    if (representant) {
      rows.push({
        dossier,
        involvement: "personne_contact",
        personne_physique: await insertPersonne(representant),
      });
    }
    if (rows.length > 0) await knex("dossier_acteur").insert(rows);
  }
}

/** identite_dossier is still written, so up can fill these acteurs again. */
export async function down(knex: Knex) {
  await knex("dossier_acteur")
    .whereIn("dossier", knex("dossier").select("id").whereNot("source", "demarche_numerique"))
    .delete();
}
