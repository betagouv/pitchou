const normalize = (value) =>
  (value ?? "")
    .normalize("NFD")
    .replaceAll(/\p{M}/gu, "")
    .toUpperCase()
    .replaceAll(/[^A-Z0-9]+/gu, " ")
    .trim();
const generic =
  /^(AUTRES?|ASSOCIATIONS?|ENTREPRISES?|SOCIETES?|PERSONNE MORALE|COLLECTIVITES?( TERRITORIALES?)?|PARTICULIERS?|ETABLISSEMENT PUBLIC|ORGANISME PUBLIC|COMMUNES?|MAIRIE|CONSEIL (GENERAL|DEPARTEMENTAL)|DEPARTEMENT|UNIVERSITE|PRIVE|PUBLIC|NEANT|NON RENSEIGNE|SANS OBJET|SASU?|SARL|SCCV|SNC|SA|EURL|OPH|EPCI|SEM|ONG|BUREAU D ETUDES)$/u;
const role =
  /^(M|MME|MR|MONSIEUR|MADAME|DIRECTEUR|DIRECTRICE|PRESIDENT|PRESIDENTE|MAIRE|GERANT|RESPONSABLE|CHEF|CHARGE|CHARGEE|REPRESENTANT|REPRESENTE|INSTRUCTION|INSTRUCTEUR|INSTRUCTRICE)( |$)/u;
const organisationWords =
  /^(?:(?:LA|LE|LES|L) )?(SASU?|SARL|SCCV|SNC|SOCIETE|ASSOCIATION|COMMUNE|MAIRIE|DREAL|DIRECTION|DEPARTEMENT|ENTREPRISE|OFFICE|UNIVERSITE|FEDERATION|SYNDICAT|COMMUNAUTE|METROPOLE|CONSEIL|EDF|RTE|SNCF|ONF|CNRS|LPO|DEAL|CONSERVATOIRE|MUSEUM|MINISTERE|GROUPE|CARRIERES?|INSTITUT|MUSEE|PARC|RESERVE|LABORATOIRE|UMR|UMS)\b/u;
const clean = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);

function needsOwnershipReview(project, demandes) {
  const context = normalize(
    [project.precisionpetitionnaire, project.nompersonne, project.cmtprojet]
      .filter(Boolean)
      .join(" "),
  );
  return (
    /\b(MANDAT\w*|MISSIONNE\w*|CONFIE\w*)\b|POUR LE COMPTE|PLUSIEURS (SOCIETES|PETITIONNAIRES|PORTEURS|MAITRES?)|\b\d+ (SOCIETES|PETITIONNAIRES|MAITRES?|SAS|SARL)/u.test(
      context,
    ) ||
    demandes.some((d) =>
      /BENEFICIAIRE|PETITIONNAIRE|PORTEUR|MAITRE D OUVRAGE/u.test(normalize(d.cmtdemande)),
    )
  );
}

function needsNameReview(name) {
  const normalized = normalize(name);
  // Compound names remain in the review queue; they are not asserted to be multiple owners.
  return (
    /^(GROUPE|RESERVE NATURELLE NATIONALE|SOCIETE (HLM|CIVILE D EXPLOITATION AGRICOLE|ANONYME D (HABITATIONS? A LOYER MODERE|HLM)|D ECONOMIE MIXTE))$/u.test(
      normalized,
    ) ||
    !organisationWords.test(normalized) ||
    /[@\n\r;(),/&+:]/u.test(name) ||
    /\bET\b|DIRECTOIRE|CONSEIL DE SURVEILLANCE|ENTREPRISE SOCIALE POUR L HABITAT/u.test(normalized)
  );
}

/** Preserve an explicit organisation declaration, never infer a registry identity or establishment. */
export function prepareDeclaredOrganisation(project, demandes, category) {
  const reject = (reason) => ({ porteur: null, reason });
  if (category !== "Personne Morale")
    return reject("Source category does not declare an organisation");
  if (needsOwnershipReview(project, demandes))
    return reject("Representative or multiple-owner context needs individual review");
  const explicit = clean(project.precisionpetitionnaire);
  let field = "precisionpetitionnaire",
    name = explicit;
  if (!name || generic.test(normalize(name))) {
    field = "nompersonne";
    name = clean(project.nompersonne);
    if (!name || !organisationWords.test(normalize(name)))
      return reject(
        "No explicit organisation name; contact names and category labels are not substitutes",
      );
  }
  const normalized = normalize(name);
  if (needsNameReview(name))
    return reject("Applicant text needs review before treating it as an organisation name");
  if (
    normalized.length < 3 ||
    name.length > 200 ||
    generic.test(normalized) ||
    role.test(normalized)
  )
    return reject("Applicant field is a role, generic label or unusable name");
  if (
    demandes.some((d) => {
      const representative = normalize(d.nommandataire);
      return (
        representative.length >= 4 &&
        (normalized.includes(representative) || representative.includes(normalized))
      );
    })
  )
    return reject("Selected name also identifies the mandataire");
  return {
    porteur: {
      type: "organisation",
      values: {
        name,
        address: clean(project.adressepetitionnaire),
        siren: null,
        verification_status: "source_declared",
        source: "Onagre",
        source_reference: `Projet ${project.codeprojet || project.projetid} (n° ${project.projetid})`,
        verification_evidence: null,
      },
    },
    reason: `Original Onagre ${field} declaration retained without registry verification. No SIREN or SIRET inferred.`,
  };
}
