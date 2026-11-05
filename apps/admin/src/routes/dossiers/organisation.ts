import type { PorteurDeProjetOrganisation } from "@pitchou/types/porteurDeProjet.ts";

export type OrganisationForm = ReturnType<typeof organisationForm>;
export type OrganisationField = keyof OrganisationForm;

export function organisationForm(value?: Omit<PorteurDeProjetOrganisation, "type"> | null) {
  return {
    name: value?.name ?? "",
    address: value?.address ?? "",
    siren: value?.siren ?? "",
    verification_status: value?.verification_status ?? "source_declared",
    source: value?.source ?? "pitchou",
    source_reference: value?.source_reference ?? "",
    verification_evidence: value?.verification_evidence ?? "",
  };
}

export function organisationErrors(
  value: OrganisationForm,
): Partial<Record<OrganisationField, string>> {
  return {
    ...(value.name.trim() ? {} : { name: "Renseignez le nom de l'organisation." }),
    ...(value.source.trim() ? {} : { source: "Renseignez la source." }),
    ...(value.source_reference.trim()
      ? {}
      : { source_reference: "Renseignez la référence dans la source." }),
    ...(value.verification_status === "verified" && !value.verification_evidence.trim()
      ? { verification_evidence: "Renseignez le justificatif de vérification." }
      : {}),
    ...(value.verification_status === "verified" &&
    value.siren.trim() &&
    !/^\d{9}$/u.test(value.siren.replaceAll(" ", ""))
      ? { siren: "Le numéro de SIREN doit contenir 9 chiffres." }
      : {}),
  };
}

export function organisationPayload(
  value: OrganisationForm,
): Omit<PorteurDeProjetOrganisation, "type"> {
  const verified = value.verification_status === "verified";
  return {
    name: value.name.trim(),
    address: value.address.trim() || null,
    siren: verified ? value.siren.replaceAll(" ", "") || null : null,
    verification_status: value.verification_status,
    source: value.source.trim(),
    source_reference: value.source_reference.trim(),
    verification_evidence: verified ? value.verification_evidence.trim() || null : null,
  };
}
