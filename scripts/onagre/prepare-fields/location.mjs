export function prepareLocation(rows, { allowProjectLocationFallback = false } = {}) {
  const demande = rows.demandes[0];
  const projet = rows.projet[0];
  const evidence = [];
  const issues = [];
  const department = (id) => {
    const row = (rows.departements ?? []).find((item) => item.departementsid === id);
    if (!row) throw new Error(`Missing source department ${id}`);
    const code = row.codedept?.replace(/^0(?=\d{2}$)/u, "");
    if (!/^(?:\d{2,3}|2[AB])$/u.test(code ?? "")) throw new Error("Invalid source department code");
    evidence.push(`departements:${id}.codedept`);
    return code;
  };
  let links = (rows.communes_demandes ?? []).filter((row) => row.demandesid === demande.demandesid);
  const projectLinks = (rows.communes_projet ?? []).filter(
    (row) => row.projetid === projet.projetid,
  );
  let origin = "demande";
  if (links.length === 0 && projectLinks.length > 0) {
    if (allowProjectLocationFallback && !demande.departementsid && !demande.regions) {
      links = projectLinks;
      origin = "project-fallback";
    } else if (!demande.departementsid && !demande.regions) {
      issues.push({
        code: "location-needs-review",
        blocking: false,
        message: "Localisation présente au niveau du projet uniquement : reprise à décider.",
      });
    }
  }
  // projet.communesid is not a project-location link: it may describe the applicant's address.
  const communes = new Map();
  const departments = new Set();
  for (const link of links) {
    const row = (rows.communes ?? []).find((item) => item.communesid === link.communesid);
    if (!row) throw new Error(`Missing source commune ${link.communesid}`);
    if (
      !/^[0-9AB]{5}$/u.test(row.codeinseecommunes ?? "") ||
      !/^\d{5}$/u.test(row.codepostalcommune ?? "") ||
      !row.nomcommune?.trim()
    )
      throw new Error(`Incomplete source commune ${link.communesid}`);
    communes.set(row.codeinseecommunes, {
      name: row.nomcommune,
      code: row.codeinseecommunes,
      postalCode: row.codepostalcommune,
    });
    departments.add(department(row.departementsid));
    evidence.push(
      `${origin === "demande" ? "communes_demandes" : "communes_projet"}:${origin === "demande" ? demande.demandesid : projet.projetid}:${link.communesid}`,
      `communes:${link.communesid}.codeinseecommunes`,
    );
  }
  let primary = demande.departementsid ? department(demande.departementsid) : null;
  if (primary) {
    evidence.push(`demandes:${demande.demandesid}.departementsid`);
    if (departments.size > 0 && !departments.has(primary))
      throw new Error("Demande department conflicts with its communes; review required");
    departments.add(primary);
  } else if (departments.size === 1) primary = [...departments][0];
  return formatLocation(communes, departments, primary, origin, evidence, issues);
}

function formatLocation(communes, departments, primary, origin, evidence, issues) {
  const status =
    communes.size > 0
      ? origin
      : departments.size > 0
        ? "department-only"
        : issues.length > 0
          ? "needs-review"
          : "missing-source";
  if (communes.size === 0 && issues.length === 0)
    issues.push({
      code: "location-source-incomplete",
      blocking: false,
      message:
        departments.size > 0
          ? "Département connu, aucune commune liée à la demande. La commune du porteur n’est pas utilisée."
          : "Aucune localisation exploitable liée à la demande. La commune du porteur n’est pas utilisée.",
    });
  return {
    fields: {
      communes:
        communes.size > 0
          ? [...communes.values()].sort((a, b) => a.code.localeCompare(b.code))
          : null,
      departments: departments.size > 0 ? [...departments].sort() : null,
      primary_department: primary,
    },
    evidence: [...new Set(evidence)],
    issues,
    status,
  };
}
