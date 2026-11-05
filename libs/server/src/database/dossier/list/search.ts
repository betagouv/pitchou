import type { Knex } from "knex";
import type { UserId } from "@pitchou/types/permissions.ts";
import { departements } from "@pitchou/common/departements.ts";
import { summaryInvolvements } from "@pitchou/common/dossierActeur.ts";
import { normalizedSql } from "./params.ts";
import { visibleFollows } from "./relations.ts";

/** Build one searchable value per demande inside PostgreSQL, never transfer full summaries. */
export function applySearch(
  query: Knex.QueryBuilder,
  root: Knex.QueryBuilder,
  db: Knex,
  userId: UserId,
  terms: string[],
) {
  if (terms.length === 0) return query;
  const follows = visibleFollows(db, userId)
    .clearSelect()
    .select(db.raw("string_agg(follower.email, ' ')"));
  const acteurs = db("dossier_acteur as actor")
    .join("personne_physique as actor_person", "actor_person.id", "actor.personne_physique")
    .select(
      db.raw("string_agg(concat_ws(' ', actor_person.last_name, actor_person.first_names), ' ')"),
    )
    .whereRaw("actor.dossier = d.id")
    .whereIn("actor.involvement", summaryInvolvements);
  addSpeciesCoverage(root, db, terms);
  query
    .leftJoin("species_matches", "species_matches.dossier", "d.id")
    .leftJoin("dossier_projet as project", "project.id", "member.projet")
    .leftJoin("porteur_de_projet as porteur", "porteur.id", "d.porteur_de_projet")
    .leftJoin("entreprise as company", "company.siret", "porteur.personne_morale")
    .leftJoin("organisation as organisation", "organisation.id", "porteur.organisation")
    .leftJoin("personne_physique as person", "person.id", "porteur.personne_physique")
    .crossJoin(
      db.raw(
        `lateral (select ${normalizedSql(`concat_ws(' ',
      d.name, project.name, member.label, d.main_activite, activite.label,
      d.demarche_numerique_number, d.onagre_demande_identifier,
      case when porteur.personne_morale is not null then company.legal_name else person.last_name end,
      case when porteur.personne_morale is not null then company.siret else person.first_names end,
      organisation.name, organisation.siren,
      (select string_agg(dep.value, ' ') from json_array_elements_text(d.departments) dep(value)),
      (select string_agg(reg.value, ' ') from json_array_elements_text(d.regions) reg(value)),
      (select string_agg(concat_ws(' ', commune->>'name', commune->>'postalCode'), ' ')
        from jsonb_array_elements(coalesce(d.communes::jsonb, '[]'::jsonb)) commune),
      (select string_agg(?::jsonb->>dep.value, ' ') from json_array_elements_text(d.departments) dep(value)),
      (select string_agg(decision.number, ' ') from decision_administrative decision where decision.dossier = d.id),
      case when access.access <> 'lecture' then
        (select content from commentaire where dossier = d.id order by created_at desc, id desc limit 1) end,
      (?), (?)
    )`)} as text) searchable`,
        [
          JSON.stringify(Object.fromEntries(departements.map(({ code, name }) => [code, name]))),
          acteurs,
          follows,
        ],
      ),
    );
  query.select("searchable.text as search_text", "species_matches.terms as species_terms");
  root.withMaterialized("searchable_demandes", query);
  return db("searchable_demandes")
    .select("id", "group_key", "sort_date")
    .whereNotExists(
      db("search_terms as term")
        .select(db.raw("1"))
        .whereRaw("strpos(searchable_demandes.search_text, term.term) = 0")
        .whereRaw("not coalesce(term.term_index = any(searchable_demandes.species_terms), false)"),
    );
}

function addSpeciesCoverage(root: Knex.QueryBuilder, db: Knex, terms: string[]) {
  // Normalize each reference once instead of repeatedly normalizing millions of impact rows.
  root.withMaterialized(
    "search_species",
    db("espece_protegee")
      .select("cd_ref")
      .select(
        db.raw(
          `${normalizedSql("concat_ws(' ', array_to_string(noms_vernaculaires, ' '), array_to_string(noms_scientifiques, ' '))")} as text`,
        ),
      ),
  );
  root.withMaterialized(
    "search_terms",
    db.raw(
      `select * from (values ${terms.map(() => "(?::text, ?::integer)").join(", ")}) as terms(term, term_index)`,
      terms.flatMap((term, index) => [term, index + 1]),
    ),
  );
  root.withMaterialized(
    "species_term_matches",
    db("search_species as species")
      .crossJoin(db.raw("search_terms as term"))
      .select("species.cd_ref", "term.term_index")
      .whereRaw("strpos(species.text, term.term) > 0"),
  );
  // A single row per demande keeps both row cardinality and join planning independent of term count.
  root.withMaterialized(
    "species_matches",
    db("impact_espece as impact")
      .join("species_term_matches as matches", "matches.cd_ref", "impact.cd_ref")
      .select("impact.dossier")
      .select(db.raw("array_agg(distinct matches.term_index) as terms"))
      .groupBy("impact.dossier"),
  );
}
