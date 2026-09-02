import type { Knex } from "knex";

const SEED_EMAIL = process.env.SEED_EMAIL || "dev@localhost.local";

// Hand-written HTML matching the admin editor's sanitize allowlist
// (p, h2/h3, strong/em, lists, links…), as stored in `contenu`.
const CONTENU = `<p>Pitchou fait peau neuve&nbsp;! Cette première entrée inaugure la page «&nbsp;Nouveautés&nbsp;», où nous annoncerons les évolutions de l'outil au fil des versions.</p>
<h2>Ce qui change</h2>
<ul>
<li><strong>Page Nouveautés</strong>&nbsp;: retrouvez ici les nouveautés de chaque version, sans avoir besoin de compte.</li>
<li><strong>Suivi des dossiers</strong>&nbsp;: la liste des dossiers gagne des filtres et un tri plus rapides.</li>
<li><strong>Espèces impactées</strong>&nbsp;: les fichiers d'espèces sont désormais analysés automatiquement à l'import.</li>
</ul>
<h2>Et ensuite&nbsp;?</h2>
<p>Les prochaines versions seront annoncées sur cette page. Une remarque, une idée&nbsp;? Écrivez-nous à <a href="mailto:pitchou@beta.gouv.fr" rel="noopener noreferrer" target="_blank">pitchou@beta.gouv.fr</a>.</p>`;

export async function seed(knex: Knex) {
  await knex("changelog")
    .insert({
      version_major: 1,
      version_minor: 0,
      version_patch: 0,
      date: "2026-08-19",
      titre: "Une page Nouveautés pour suivre les évolutions de Pitchou",
      contenu: CONTENU,
      published: true,
      updated_by: SEED_EMAIL,
    })
    .onConflict(["version_major", "version_minor", "version_patch"])
    .ignore();
}
