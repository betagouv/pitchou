import type Entreprise from "@pitchou/types/database/public/Entreprise.ts";
import { companyPropertyLabels, identityPropertyLabels } from "@pitchou/types/notification.ts";
import type {
  PorteurDeProjet,
  PorteurDeProjetPersonnePhysique,
} from "@pitchou/types/porteurDeProjet.ts";

export function entrepriseStatus({
  admin_status,
}: Pick<Entreprise, "admin_status">): string | null {
  if (admin_status === "Actif") return "En activité";
  if (admin_status === "Ferme") return "Fermé";
  return null;
}

export function entrepriseCreationDate({
  creation_date,
}: Pick<Entreprise, "creation_date">): string | null {
  if (!creation_date) return null;
  const parsed = new Date(creation_date);
  return Number.isNaN(parsed.getTime()) ? creation_date : parsed.toLocaleDateString("fr-FR");
}

/** « 432 296 234 00029 » / « 432 296 234 »; any other value is kept as is. */
export function formatSiret(value: string | null): string | null {
  return (
    value?.replace(/^(\d{3})(\d{3})(\d{3})(\d{5})?$/, (_, a, b, c, d) =>
      [a, b, c, d].filter(Boolean).join(" "),
    ) ?? null
  );
}

export function formatShareCapital(value: string | null): string | null {
  const amount = Number(value);
  if (!value || !Number.isFinite(amount)) return value;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export type PorteurRow = {
  label: string;
  value: string | null;
  kind: "text" | "email" | "phone" | "address" | "status";
  /** Key of the field in the notification changes. */
  changeKey: string;
};
export type PorteurGroup = { title: string; rows: PorteurRow[] };

function personneMoraleGroups(entreprise: Entreprise): PorteurGroup[] {
  const row = (
    property: keyof Entreprise,
    value: string | null = entreprise[property],
    kind: PorteurRow["kind"] = "text",
  ): PorteurRow => ({
    label: companyPropertyLabels[property],
    value: value || null,
    kind,
    changeKey: `entreprise.${property}`,
  });
  const status = entrepriseStatus(entreprise) ?? entreprise.admin_status;
  return [
    {
      title: "Identification",
      rows: [
        row("legal_name"),
        row("siret", formatSiret(entreprise.siret)),
        row("siren", formatSiret(entreprise.siren)),
        row("legal_form"),
        row("creation_date", entrepriseCreationDate(entreprise)),
        row("admin_status", status, "status"),
        row("headcount"),
        row("share_capital", formatShareCapital(entreprise.share_capital)),
      ],
    },
    { title: "Activité", rows: [row("naf_code"), row("naf_label")] },
    {
      title: "Localisation",
      rows: [
        row("address", entreprise.address, "address"),
        row("postal_code"),
        row("insee_code"),
        row("department"),
        row("region"),
      ],
    },
  ];
}

function personnePhysiqueGroups(personne: PorteurDeProjetPersonnePhysique): PorteurGroup[] {
  // Changes of a personne physique come from the Démarche Numérique identity.
  const row = (
    property: keyof typeof identityPropertyLabels | "address",
    kind: PorteurRow["kind"] = "text",
  ): PorteurRow => ({
    label: property === "address" ? "Adresse" : identityPropertyLabels[property],
    value: personne[property] || null,
    kind,
    changeKey: `demandeur.${property}`,
  });
  return [
    { title: "Identité", rows: [row("last_name"), row("first_names"), row("role")] },
    {
      title: "Coordonnées",
      rows: [row("email", "email"), row("phone", "phone"), row("address", "address")],
    },
  ];
}

/** Every column of the porteur de projet, grouped and formatted for display. */
export function porteurDeProjetGroups(porteur: PorteurDeProjet): PorteurGroup[] {
  return porteur.type === "personne_morale"
    ? personneMoraleGroups(porteur)
    : personnePhysiqueGroups(porteur);
}
