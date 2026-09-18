// Match the circle fills in static/icons/activites without stretching the artwork.
const groups: Record<string, string[]> = {
  "#FCEEAC": [
    "energie-autres",
    "energie-nucleaire",
    "energie-eolien",
    "energie-eolien-suivi-mortalite",
    "energie-photovoltaique",
    "energie-hydroelectricite",
    "energie-methaniseur-biomasse",
  ],
  "#F7EBE5": [
    "amenagements-fonciers",
    "carrieres",
    "exploitation-forestiere",
    "industries-production",
    "installations-agricoles",
    "gestion-dechets",
    "plateformes-logistiques",
    "unite-touristique-nouvelle",
    "zac",
  ],
  "#F7ECDB": ["desairage", "dommages-biens-activites", "peril-animalier"],
  "#E6EEFE": [
    "infrastructures-autres",
    "infrastructures-aeroportuaires",
    "defense-contre-la-mer",
    "transport-ferroviaire",
    "transport-maritime-fluvial",
    "transport-routier",
  ],
  "#FEEBD0": [
    "transport-autres-canalisations",
    "transport-eau-aqueduc",
    "transport-electricite",
    "transport-gaz",
    "transport-hydrocarbures",
  ],
  "#FEE9E7": [
    "loisir-tourisme",
    "batiments-services-publics",
    "restauration-batiments",
    "urbanisation-logement",
  ],
  "#C9FCAC": ["conservation-especes", "gestion-eau", "restauration-ecologique"],
  "#C7F6FC": ["demande-scientifique", "pedagogique-enseignement"],
  "#C3FAD5": ["autre", "evenementiel", "securite-sante-publique"],
};

export function activityBackground(src: string): string {
  const slug = src
    .split("/")
    .pop()
    ?.replace(/\.svg$/, "");
  return Object.entries(groups).find(([, slugs]) => slug && slugs.includes(slug))?.[0] ?? "#C3FAD5";
}
