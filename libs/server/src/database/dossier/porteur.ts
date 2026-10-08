import type {
  PorteurDeProjet,
  PorteurDeProjetPersonneMorale,
  PorteurDeProjetPersonnePhysique,
} from "@pitchou/types/porteurDeProjet.ts";

const personnePhysiqueColumns = [
  "first_names",
  "last_name",
  "email",
  "address",
  "phone",
  "role",
] as const;
const entrepriseColumns = [
  "siret",
  "legal_name",
  "address",
  "siren",
  "legal_form",
  "naf_code",
  "naf_label",
  "creation_date",
  "admin_status",
  "headcount",
  "share_capital",
  "insee_code",
  "postal_code",
  "department",
  "region",
] as const;

// Flat columns of the porteur, gathered back into one object by `withPorteurDeProjet`.
export const porteurDeProjetColumns = [
  "porteur_de_projet.personne_physique as porteur_personne_physique",
  "porteur_de_projet.personne_morale as porteur_personne_morale",
  ...personnePhysiqueColumns.map((column) => `porteur_pp.${column} as porteur_pp_${column}`),
  ...entrepriseColumns.map(
    (column) => `porteur_entreprise.${column} as porteur_entreprise_${column}`,
  ),
];

export function joinPorteurDeProjet<T extends { leftJoin: Function }>(query: T): T {
  return query
    .leftJoin("porteur_de_projet", "porteur_de_projet.id", "dossier.porteur_de_projet")
    .leftJoin(
      "personne_physique as porteur_pp",
      "porteur_pp.id",
      "porteur_de_projet.personne_physique",
    )
    .leftJoin(
      "entreprise as porteur_entreprise",
      "porteur_entreprise.siret",
      "porteur_de_projet.personne_morale",
    );
}

function takeColumns(row: Record<string, unknown>, prefix: string, columns: readonly string[]) {
  return Object.fromEntries(
    columns.map((column) => {
      const value = row[`${prefix}${column}`] ?? null;
      delete row[`${prefix}${column}`];
      return [column, value];
    }),
  );
}

/** Replaces the flat porteur columns of a row by its `porteur_de_projet` object. */
export function withPorteurDeProjet<T extends object>(
  dossier: T,
): T & { porteur_de_projet: PorteurDeProjet | null } {
  const row = dossier as Record<string, unknown>;
  const personnePhysique = takeColumns(row, "porteur_pp_", personnePhysiqueColumns);
  const entreprise = takeColumns(row, "porteur_entreprise_", entrepriseColumns);
  const isPersonneMorale = row.porteur_personne_morale != null;
  const isPersonnePhysique = row.porteur_personne_physique != null;
  delete row.porteur_personne_morale;
  delete row.porteur_personne_physique;
  row.porteur_de_projet = isPersonneMorale
    ? ({ type: "personne_morale", ...entreprise } as PorteurDeProjetPersonneMorale)
    : isPersonnePhysique
      ? ({ type: "personne_physique", ...personnePhysique } as PorteurDeProjetPersonnePhysique)
      : null;
  return dossier as T & { porteur_de_projet: PorteurDeProjet | null };
}
