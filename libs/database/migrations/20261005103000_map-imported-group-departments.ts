import type { Knex } from "knex";

// Frozen snapshot of Pitchou's department codes, including overseas and foreign locations.
const allDepartments = (
  "01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 2A 2B " +
  "21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 " +
  "50 51 52 53 54 55 56 57 58 59 60 61 62 63 64 65 66 67 68 69 70 71 72 73 74 75 76 77 78 79 " +
  "80 81 82 83 84 85 86 87 88 89 90 91 92 93 94 95 971 972 973 974 975 976 977 978 984 986 987 988 99"
).split(" ");

// Routing and inactive groups transcribed from the DN screenshots supplied on 2026-10-05.
// Regional lists verified against https://geo.api.gouv.fr/departements on the same date.
// Keep explicit names: unknown or more specialized services need administrator guidance.
const coverageByName: Record<string, string[]> = {
  administrateur: allDepartments,
  "dev pitchou": ["99"],
  ddt02: ["02"],
  "ddt02 aisne": ["02"],
  ddt37: ["37"],
  "ddt 41": ["41"],
  "ddt 45 loiret": ["45"],
  "ddt59 nord": ["59"],
  "ddtm 62": ["62"],
  "ddtm 80": ["80"],
  "deal guadeloupe": ["971"],
  "deal martinique": ["972"],
  "dealm mayotte": ["976"],
  "deal reunion": ["974"],
  "dgtm guyane": ["973"],
  "dreal auvergne rhone alpes": "01 03 07 15 26 38 42 43 63 69 73 74".split(" "),
  "dreal bfc": "21 25 39 58 70 71 89 90".split(" "),
  "dreal bretagne": "22 29 35 56".split(" "),
  "dreal centre val de loire": "18 28 36 37 41 45".split(" "),
  "dreal de corse et dmlc": ["2A", "2B"],
  "dreal grand est": "08 10 51 52 54 55 57 67 68 88".split(" "),
  "dreal normandie": "14 27 50 61 76".split(" "),
  "dreal nouvelle aquitaine": "16 17 19 23 24 33 40 47 64 79 86 87".split(" "),
  "dreal occitanie": "09 11 12 30 31 32 34 46 48 65 66 81 82".split(" "),
  "dreal paca": "04 05 06 13 83 84".split(" "),
  "dreal pays de la loire": "44 49 53 72 85".split(" "),
  "driat idf": "75 77 78 91 92 93 94 95".split(" "),
  "drieat idf": "75 77 78 91 92 93 94 95".split(" "),
};

const inactiveNames = new Set(["ddt37", "ddt 41", "ddt 45 loiret"]);

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function up(db: Knex) {
  await db.raw("select pg_advisory_xact_lock(2105102026)");
  const groups = await db("groupe_instructeurs")
    .where({ coverage_needs_review: true })
    .whereNotNull("demarche_number")
    .select("id", "name");
  const additions: { groupe_instructeurs: string; department: string }[] = [];
  const reviewed: string[] = [];
  const inactive: string[] = [];
  for (const group of groups) {
    const name = normalizeName(group.name);
    const departments = Object.hasOwn(coverageByName, name) ? coverageByName[name] : undefined;
    if (!departments) continue;
    const existing: string[] = await db("groupe_departement")
      .where({ groupe_instructeurs: group.id })
      .pluck("department");
    // Preserve earlier coverage; conflicting geography still needs a human review.
    if (existing.every((department) => departments.includes(department))) reviewed.push(group.id);
    if (inactiveNames.has(name)) inactive.push(group.id);
    additions.push(
      ...departments.map((department) => ({ groupe_instructeurs: group.id, department })),
    );
  }
  // Deactivate before adding coverage so these services never acquire dossiers during the migration.
  if (inactive.length)
    await db("groupe_instructeurs").whereIn("id", inactive).update({ active: false });
  // One insert lets the ownership trigger recalculate all affected dossiers together.
  if (additions.length)
    await db("groupe_departement")
      .insert(additions)
      .onConflict(["groupe_instructeurs", "department"])
      .ignore();
  if (reviewed.length)
    await db("groupe_instructeurs")
      .whereIn("id", reviewed)
      .update({ coverage_needs_review: false });
}

export async function down() {
  throw new Error(
    "Restore a pre-migration backup to recover the previous group coverage and follows.",
  );
}
