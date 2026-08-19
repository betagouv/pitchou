import type { Knex } from "knex";

/**
 * The « Activité principale » of a dossier has always been stored as the raw label coming from
 * Démarche Numérique (`dossier.main_activite`). When an option is renamed in DN, the old and the
 * new labels are treated as two different activities even though they are the same one.
 *
 * These two tables give Pitchou its own activity referentiel:
 * - `activite` is the canonical list, owned by Pitchou (admins can rename entries or add new ones);
 * - `activite_label` groups every raw label ever seen under one `activite`. Labels the sync
 *   discovers before an admin mapped them land on the "autre" activity with `needs_review` set,
 *   so the admin app can surface them for review.
 *
 * Dossiers keep storing the raw label; grouping is resolved by joining through `activite_label`,
 * so a remapping decided by an admin applies immediately to every dossier.
 */

type ActiviteRow = { code: string; label: string };

/** Codes reuse the icon slugs of `apps/admin/static/icons/activites`; labels are the current DN options. */
export const ACTIVITES: ActiviteRow[] = [
  { code: "amenagements-fonciers", label: "Aménagements fonciers (AFAF, remembrement)" },
  { code: "carrieres", label: "Carrières" },
  { code: "conservation-especes", label: "Conservation des espèces" },
  { code: "demande-scientifique", label: "Demande à caractère scientifique" },
  { code: "desairage", label: "Desaîrage" },
  { code: "dommages-biens-activites", label: "Dommages aux biens et activités" },
  { code: "evenementiel", label: "Événementiel avec ou sans aménagement temporaire" },
  { code: "exploitation-forestiere", label: "Exploitation forestière" },
  { code: "industries-production", label: "Industries de production de biens et marchandises" },
  { code: "infrastructures-autres", label: "Infrastructures - Autres" },
  { code: "infrastructures-aeroportuaires", label: "Infrastructures aéroportuaires" },
  { code: "defense-contre-la-mer", label: "Infrastructures des ouvrages de défense contre la mer" },
  { code: "transport-ferroviaire", label: "Infrastructures de transport ferroviaire" },
  { code: "transport-maritime-fluvial", label: "Infrastructures de transport maritime et fluvial" },
  { code: "transport-routier", label: "Infrastructures de transport routières" },
  { code: "installations-agricoles", label: "Installations agricoles" },
  { code: "gestion-dechets", label: "Installations de gestion des déchets" },
  { code: "loisir-tourisme", label: "Installations de loisir et de tourisme" },
  { code: "pedagogique-enseignement", label: "Pédagogique enseignement" },
  { code: "peril-animalier", label: "Péril animalier" },
  { code: "plateformes-logistiques", label: "Plate-formes logistiques, centres commerciaux" },
  { code: "securite-sante-publique", label: "Préservation de la sécurité et santé publique" },
  { code: "energie-nucleaire", label: "Production énergie autre-projets liés au nucléaire" },
  { code: "energie-eolien", label: "Production énergie renouvelable - Éolien" },
  {
    code: "energie-eolien-suivi-mortalite",
    label: "Production énergie renouvelable - Éolien -  Suivi mortalité",
  },
  { code: "energie-photovoltaique", label: "Production énergie renouvelable - Photovoltaïque" },
  { code: "energie-hydroelectricite", label: "Production énergie renouvelable - Hydroélectricité" },
  {
    code: "energie-methaniseur-biomasse",
    label: "Production énergie renouvelable - Méthaniseur, biomasse",
  },
  { code: "energie-autres", label: "Production énergie renouvelable - Autres" },
  {
    code: "batiments-services-publics",
    label: "Projets de bâtiments pour les services publics-installations sportives",
  },
  { code: "gestion-eau", label: "Projets liés à la gestion de l’eau" },
  { code: "restauration-ecologique", label: "Restauration écologique" },
  {
    code: "restauration-batiments",
    label: "Restauration, réfection, entretien et démolition de bâtiments et ouvrages d’art",
  },
  { code: "transport-autres-canalisations", label: "Transport (autres canalisations)" },
  { code: "transport-eau-aqueduc", label: "Transport eau aqueduc" },
  { code: "transport-electricite", label: "Transport énergie électrique" },
  { code: "transport-gaz", label: "Transport gaz" },
  { code: "transport-hydrocarbures", label: "Transport hydrocarbures" },
  {
    code: "urbanisation-logement",
    label: "Urbanisation logement (déclaration préalable travaux, PC, permis d’aménager)",
  },
  { code: "unite-touristique-nouvelle", label: "UTN (Unité Touristique Nouvelle)" },
  { code: "zac", label: "ZAC" },
  { code: "autre", label: "Autre" },
];

export const AUTRE_ACTIVITE_CODE = "autre";

export async function up(knex: Knex) {
  await knex.schema.createTable("activite", function (table) {
    table.comment(
      "Referentiel of the activities behind a derogation request, owned by Pitchou. Dossiers " +
        "reference an activity through the raw labels grouped in activite_label.",
    );

    table
      .text("code")
      .primary()
      .comment("Stable identifier, e.g. 'carrieres'. Also names the activity icon file.");
    table
      .text("label")
      .notNullable()
      .unique()
      .comment("Display name shown in Pitchou, decided by administrators.");
  });

  await knex.schema.createTable("activite_label", function (table) {
    table.comment(
      "Raw « Activité principale » labels as stored on dossiers, grouped under one activite. " +
        "Several labels can point to the same activity when an option was renamed in " +
        "Démarche Numérique over time.",
    );

    table
      .text("label")
      .primary()
      .comment("Exact raw label as it appears in dossier.main_activite.");
    table
      .text("activite_code")
      .notNullable()
      .references("code")
      .inTable("activite")
      .comment("Activity this label is grouped under.");
    table
      .boolean("needs_review")
      .notNullable()
      .defaultTo(false)
      .comment(
        "True while the label was auto-assigned to the 'autre' activity (by the DN sync or by " +
          "this migration's backfill) and no administrator has reviewed it yet.",
      );
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment("When the label was first registered, i.e. when the sync detected it.");
  });

  await knex("activite").insert(ACTIVITES);
  await knex("activite_label").insert(
    ACTIVITES.map(({ code, label }) => ({ label, activite_code: code, needs_review: false })),
  );

  // Backfill: labels already present on dossiers but absent from the current DN options
  // (typically options renamed in DN over time) are parked on "autre" pending admin review.
  const knownLabels = new Set(ACTIVITES.map(({ label }) => label));
  const dossierLabels: { main_activite: string }[] = await knex("dossier")
    .distinct("main_activite")
    .whereNotNull("main_activite");
  const unknownLabels = dossierLabels
    .map(({ main_activite }) => main_activite)
    .filter((label) => label !== "" && !knownLabels.has(label));

  if (unknownLabels.length > 0) {
    await knex("activite_label").insert(
      unknownLabels.map((label) => ({
        label,
        activite_code: AUTRE_ACTIVITE_CODE,
        needs_review: true,
      })),
    );
  }
}

export async function down(knex: Knex) {
  await knex.schema.dropTableIfExists("activite_label");
  await knex.schema.dropTableIfExists("activite");
}
