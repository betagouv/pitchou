import type { ExportDossier, ExportEspece } from "@pitchou/types/dossierExport.ts";

export const dossiersExportHeaders = [
  "N° dossier",
  "Titre dossier",
  "Activité",
  "Date de dépôt / Première sollicitation",
  "Mails des instructeur·ices",
  "Département principal",
  "Localisation",
  "Dénomination et SIRET du porteur de projet",
  "Autorisation environnementale",
  "Phase actuelle",
  "Nécessité d’une DDEP ?",
  "Dossier à enjeu",
  "Espèces",
  "Espèces relevant du CNPN",
  "Espèces relevant du Ministère",
  "Saisine",
  "Avis",
  "Décision administrative : N° - Type - Date",
  "Nombre de prescriptions conformes",
  "Nombre de prescriptions non conformes ou non contrôlées",
  "Nombre de contrôles effectués",
];

function dateLabel(value: Date | string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
}

function yesNo(value: boolean | null): string {
  return value === null ? "À déterminer" : value ? "Oui" : "Non";
}

function ddepLabel(dossier: ExportDossier): string {
  if (dossier.ddep_required === null) return "À déterminer";
  if (dossier.ddep_required) return "Oui";
  return dossier.er_mesures_sufficient ? "Non car mesures ER suffisantes" : "Non sans objet";
}

function speciesLabel(especes: ExportEspece[]): string {
  const byReference = new Map(especes.map((espece) => [espece.cd_ref, espece]));
  return [...byReference.values()]
    .map((espece) => {
      const scientific = espece.noms_scientifiques?.[0];
      const vernacular = espece.noms_vernaculaires?.[0];
      return vernacular && scientific
        ? `${vernacular} (${scientific})`
        : scientific || vernacular || espece.cd_ref;
    })
    .sort((a, b) => a.localeCompare(b, "fr"))
    .join(" ; ");
}

function expertLabels(avis: ExportDossier["avis"], type: "saisine" | "avis"): string {
  const experts = new Set(
    avis
      .filter((entry) =>
        type === "saisine"
          ? entry.saisine_date || entry.saisine_fichier
          : entry.avis_date || entry.avis_fichier || entry.avis,
      )
      .map(({ expert }) =>
        expert && ["CSRPN", "CNPN", "Ministre"].includes(expert) ? expert : "Autre",
      ),
  );
  return (
    ["CSRPN", "CNPN", "Ministre", "Autre"]
      .filter((expert) => experts.has(expert))
      .map((expert) => `Oui ${expert}`)
      .join(" ; ") || "Non"
  );
}

function localisation(dossier: ExportDossier): string {
  if (dossier.location_scope === "france") return "France entière";
  return [
    dossier.communes?.map(({ name }) => name).join(", "),
    dossier.departments?.join(", "),
    dossier.regions?.join(", "),
  ]
    .filter(Boolean)
    .join(" ; ");
}

export function dossierExportRow(dossier: ExportDossier): (string | number)[] {
  let conformes = 0;
  let controls = 0;
  for (const prescription of dossier.prescriptions) {
    controls += prescription.controles.length;
    const latest = [...prescription.controles].sort(
      (a, b) => new Date(b.controle_date ?? 0).getTime() - new Date(a.controle_date ?? 0).getTime(),
    )[0];
    if (latest?.result === "Conforme") conformes++;
  }
  const porteur =
    dossier.demandeur_personne_morale_legal_name ||
    [dossier.demandeur_personne_physique_last_name, dossier.demandeur_personne_physique_first_names]
      .filter(Boolean)
      .join(" ");

  return [
    dossier.demarche_numerique_number ?? String(dossier.id),
    dossier.name ?? "",
    dossier.activite_label || dossier.main_activite || "",
    dateLabel(dossier.depot_date),
    [...new Set(dossier.followers)].sort().join(" ; "),
    dossier.primary_department ?? "",
    localisation(dossier),
    [porteur, dossier.demandeur_personne_morale_siret].filter(Boolean).join(" ; "),
    yesNo(dossier.linked_to_ae_regime),
    dossier.phase,
    ddepLabel(dossier),
    yesNo(dossier.enjeu),
    speciesLabel(dossier.especes),
    speciesLabel(dossier.especes.filter(({ espece_cnpn }) => espece_cnpn)),
    speciesLabel(dossier.especes.filter(({ espece_ministerielle }) => espece_ministerielle)),
    dossier.readOnly ? "" : expertLabels(dossier.avis, "saisine"),
    expertLabels(dossier.avis, "avis"),
    dossier.decisions
      .map((decision) =>
        [decision.number ?? "", decision.type ?? "", dateLabel(decision.signature_date)].join(
          " - ",
        ),
      )
      .join(" ; "),
    dossier.readOnly ? "" : conformes,
    dossier.readOnly ? "" : dossier.prescriptions.length - conformes,
    dossier.readOnly ? "" : controls,
  ];
}

export function dossiersExportTable(dossiers: ExportDossier[]): (string | number)[][] {
  return [dossiersExportHeaders, ...dossiers.map(dossierExportRow)];
}
