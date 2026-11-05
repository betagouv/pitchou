import type { PorteurDeProjetOrganisation } from "@pitchou/types/porteurDeProjet.ts";

const isNonblank = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/** Validates organisation fields without coercing declarations into verified identities. */
export function isOrganisation(value: unknown): value is PorteurDeProjetOrganisation {
  if (value === null || typeof value !== "object") return false;
  const organisation = value as Record<string, unknown>;
  if (
    organisation.type !== "organisation" ||
    !isNonblank(organisation.name) ||
    !isNonblank(organisation.source) ||
    !isNonblank(organisation.source_reference) ||
    !(organisation.address === null || typeof organisation.address === "string")
  )
    return false;
  if (organisation.verification_status === "source_declared") {
    return organisation.siren === null && organisation.verification_evidence === null;
  }
  return (
    organisation.verification_status === "verified" &&
    isNonblank(organisation.verification_evidence) &&
    (organisation.siren === null ||
      (typeof organisation.siren === "string" && /^[0-9]{9}$/u.test(organisation.siren)))
  );
}
