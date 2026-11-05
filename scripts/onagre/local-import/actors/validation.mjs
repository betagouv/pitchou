import { isOrganisation } from "../../../../libs/common/src/organisation.ts";

const personColumns = ["first_names", "last_name", "email", "address", "phone", "role"];
const companyColumns = ["legal_name", "address", "postal_code", "insee_code"];
const organisationColumns = [
  "name",
  "address",
  "siren",
  "verification_status",
  "source",
  "source_reference",
  "verification_evidence",
];
function fields(value, columns) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).every((key) => columns.includes(key)) &&
    columns.every(
      (key) =>
        Object.hasOwn(value, key) &&
        (value[key] === null || (typeof value[key] === "string" && value[key].trim().length > 0)),
    )
  );
}
function validatePerson(person) {
  if (
    !fields(person, personColumns) ||
    !(person.first_names || person.last_name) ||
    (person.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(person.email))
  )
    throw new Error("Expected a prepared person identity with explicit nullable fields");
}
export function validateActors(proposal) {
  if (proposal.contacts !== undefined) {
    if (!Array.isArray(proposal.contacts)) throw new Error("Expected prepared contacts");
    const keys = new Set();
    for (const contact of proposal.contacts) {
      if (
        !contact ||
        Object.keys(contact).some((key) => !["sourceKey", "values"].includes(key)) ||
        typeof contact.sourceKey !== "string" ||
        !/^onagre-national:[\w:-]+$/u.test(contact.sourceKey) ||
        keys.has(contact.sourceKey)
      )
        throw new Error("Invalid or duplicate contact identity");
      keys.add(contact.sourceKey);
      validatePerson(contact.values);
    }
  }
  const porteur = proposal.porteur;
  if (porteur === undefined || porteur === null) return;
  if (typeof porteur !== "object" || Array.isArray(porteur)) throw new Error("Invalid porteur");
  if (porteur.type === "personne_physique") {
    if (Object.keys(porteur).some((key) => !["type", "values"].includes(key)))
      throw new Error("Invalid porteur");
    validatePerson(porteur.values);
  } else if (porteur.type === "personne_morale") {
    if (
      Object.keys(porteur).some(
        (key) => !["type", "siret", "values", "verification"].includes(key),
      ) ||
      !/^\d{14}$/u.test(porteur.siret ?? "") ||
      !fields(porteur.values, companyColumns) ||
      !porteur.values.legal_name ||
      porteur.verification?.status !== "verified" ||
      !porteur.verification.reason?.trim() ||
      !Array.isArray(porteur.verification.sources) ||
      porteur.verification.sources.length === 0 ||
      !porteur.verification.sources.every(
        (url) => typeof url === "string" && url.startsWith("https://"),
      )
    )
      throw new Error("Organisation requires a verified SIRET and supporting evidence");
  } else if (porteur.type === "organisation") {
    if (
      Object.keys(porteur).some((key) => !["type", "values"].includes(key)) ||
      !fields(porteur.values, organisationColumns) ||
      !isOrganisation({ ...porteur.values, type: "organisation" })
    )
      throw new Error(
        "Organisation requires explicit provenance and consistent verification evidence",
      );
  } else throw new Error("Invalid porteur type");
}
