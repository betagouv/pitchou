import type { Knex } from "knex";

export function applyUpPersonneCommentsPart1(table: Knex.AlterTableBuilder) {
  table
    .string("nom")
    .comment(`Nom de famille de la personne. Identité civile`)
    .alter({ alterNullable: false, alterType: false });
  table
    .string("prénoms")
    .comment(`Prénoms de la personne. Identité civile`)
    .alter({ alterNullable: false, alterType: false });
  table
    .string("email")
    .comment(
      `Adresse email de la personne. Utilisée pour la communication, l'authentification et l'identification unique de l'utilisateur dans le système.`,
    )
    .alter({ alterNullable: false, alterType: false });
  table
    .string("code_accès")
    .comment(
      `Code d'accès unique de la personne. Permet de récupérer un lot de capabilities dans la table, notamment dans la table arête_cap_dossier__groupe_nstructeur`,
    )
    .alter({ alterNullable: false, alterType: false });
}
