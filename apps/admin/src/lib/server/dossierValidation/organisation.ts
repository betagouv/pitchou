import { error } from "@sveltejs/kit";
import { isOrganisation } from "@pitchou/common/organisation.ts";
import type { PorteurDeProjetOrganisation } from "@pitchou/types/porteurDeProjet.ts";
import { rejectUnknownProperties } from "../requestValidation";

const properties = new Set([
  "name",
  "address",
  "siren",
  "verification_status",
  "source",
  "source_reference",
  "verification_evidence",
]);

export function parseOrganisation(raw: unknown): Omit<PorteurDeProjetOrganisation, "type"> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    error(400, "Les informations de l’organisation sont requises.");
  const value = raw as Record<string, unknown>;
  rejectUnknownProperties(value, properties);
  const organisation = { ...value, type: "organisation" };
  if (!isOrganisation(organisation))
    error(
      400,
      "L’organisation doit avoir un nom et une source. Une identité vérifiée nécessite une preuve ; une identité déclarée ne peut pas avoir de SIREN vérifié.",
    );
  const { type: _type, ...fields } = organisation;
  return fields;
}
