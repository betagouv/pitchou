import type { Knex } from "knex";

const rules = [
  {
    key: "dossier-unit",
    title: "Unité de reprise",
    status: "discuss",
    rule: "Créer un dossier Pitchou par demande Onagre et y reprendre les informations du projet lié. Conserver les liens entre demandes et projets sources.",
    notes:
      "Confirmer un dossier par demande ou par projet. Si un projet a plusieurs demandes, faut-il répéter ses informations dans chaque dossier ? Quels identifiants les instructeurs utilisent-ils pour retrouver leurs dossiers ?",
  },
  {
    key: "identity-updates",
    title: "Identifiants et mises à jour",
    status: "review",
    rule: "Identifier chaque élément par l'instance Onagre, sa table et son identifiant interne. Mémoriser son lien avec l'identifiant Pitchou et le réutiliser au prochain import. Signaler les conflits avec les modifications faites dans Pitchou. Ne pas supprimer un dossier absent d'un nouveau dump.",
    notes:
      "Définir le rapprochement avec les dossiers déjà présents dans Pitchou. Les codes visibles Onagre ne sont pas uniques. La détection des changements doit porter sur les données, pas seulement sur les compteurs de version.",
  },
  {
    key: "empty-values",
    title: "Valeurs absentes ou inconnues",
    status: "review",
    rule: "Conserver la distinction entre une valeur absente, une chaîne vide et un booléen faux. Ne pas inventer de nom, de date ou de valeur de référence. Signaler les dossiers auxquels il manque une donnée obligatoire. Ne pas créer de commentaire vide.",
    notes: "",
  },
  {
    key: "comments",
    title: "Commentaires importés",
    status: "discuss",
    rule: "Identifier les commentaires comme provenant d'Onagre et nommer le champ source. Conserver leur texte. Relier chaque commentaire à sa ligne source et au dossier cible pour éviter les doublons lors d'un nouvel import.",
    notes:
      "Choisir le compte auteur et la date des commentaires importés. Décider s'il faut un commentaire par champ ou regrouper plusieurs champs d'une même ligne source.",
  },
  {
    key: "descriptions",
    title: "Assemblage des descriptions",
    status: "review",
    rule: "Regrouper les champs repris dans la description sous des rubriques nommées, dans un ordre stable. Préserver le texte et les sauts de ligne. Mettre à jour les rubriques importées sans les ajouter une seconde fois ni écraser les ajouts des instructeurs.",
    notes: "",
  },
  {
    key: "dates",
    title: "Dates et chronologie",
    status: "discuss",
    rule: "Conserver les dates civiles Onagre sans décalage de jour. Ne pas remplacer une date absente par la date d'import. Signaler les dates invalides ou contradictoires. Reconstituer les phases dans l'ordre de leurs événements, sans faire régresser une phase plus récente.",
    notes:
      "Choisir le fuseau et l'heure pour les dates civiles destinées à un champ timestamp. Définir le traitement d'un événement dont la date manque et la priorité entre événements contradictoires.",
  },
  {
    key: "people",
    title: "Personnes et organismes",
    status: "discuss",
    rule: "Rapprocher les identités à partir de leurs données sources. Ne pas fusionner deux personnes sur leur seul nom ni découper un nom complet sans certitude. Vérifier les coordonnées et le SIRET des organismes. Ne pas créer d'identifiant artificiel pour combler une absence.",
    notes:
      "Définir les critères de rapprochement avec les personnes et entreprises déjà présentes, ainsi que le traitement des organismes sans SIRET. Les rôles et les coordonnées ambiguës restent à décider dans les correspondances concernées.",
  },
  {
    key: "routing",
    title: "Comptes, affectation et notifications",
    status: "discuss",
    rule: "Rapprocher les acteurs Onagre de comptes Pitchou confirmés. Traiter séparément le suivi individuel, l'affectation à un groupe instructeur et les services cités dans les descriptions.",
    notes:
      "Compléter la correspondance entre services Onagre et groupes Pitchou. Décider des accès, de la création éventuelle de comptes et des notifications lors de l'import.",
  },
  {
    key: "source",
    title: "Conservation des données sources",
    status: "review",
    rule: "Conserver le dump original et les décisions de correspondance. Une exclusion concerne la reprise dans les champs Pitchou, pas la suppression de la source. Utiliser les identifiants internes des références Onagre, pas les numéros de ligne du classeur. Signaler les références sans correspondance validée.",
    notes: "",
  },
];

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("onagre_shared_rule", (table) => {
    table.text("key").primary();
    table.text("title").notNullable();
    table.text("rule").notNullable();
    table.text("notes").notNullable().defaultTo("");
    table.text("status").notNullable().defaultTo("review");
    table.integer("version").notNullable().defaultTo(1);
    table.timestamp("updated_at", { useTz: true });
    table.check("status in ('review', 'discuss', 'validated')");
  });
  await knex.schema.createTable("onagre_shared_rule_revision", (table) => {
    table.increments("id");
    table.text("rule_key").notNullable().references("key").inTable("onagre_shared_rule");
    table.integer("actor_id").notNullable().references("id").inTable("auth_user");
    table.jsonb("before").notNullable();
    table.jsonb("after").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex("onagre_shared_rule").insert(rules);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("onagre_shared_rule_revision");
  await knex.schema.dropTable("onagre_shared_rule");
}
