import type {
  ActiviteMenancante,
  ByClassification,
  DescriptionImpact,
  MethodeMenancante,
  MoyenDePoursuiteMenacant,
} from "@pitchou/types/especes.d.ts";

export const activite: ActiviteMenancante = {
  "Identifiant Pitchou": "capture",
  "Code rapportage européen": "1",
  "Libellé activité directive européenne": "Capture",
  "Libellé Pitchou": "Capture",
  Méthode: "Oui",
  "Moyen de poursuite": "Oui",
  "Nombre d'individus": "Oui",
  Nids: "Oui",
  Œufs: "Oui",
  "Surface habitat détruit (m²)": "Oui",
};
export const autreActivite: ActiviteMenancante = {
  ...activite,
  "Identifiant Pitchou": "destruction",
  "Libellé Pitchou": "Destruction",
};
export const methode: MethodeMenancante = {
  Code: "filets",
  Espèces: "oiseau",
  "Libellé activité directive européenne": "Filets",
  "Libellé Pitchou": "Filets",
};
export const transport: MoyenDePoursuiteMenacant = {
  Code: "avion",
  Espèces: "oiseau",
  "Libellé activité directive européenne": "Avion",
  "Libellé Pitchou": "Avion",
};
export const initialImpact: DescriptionImpact = {
  activité: activite,
  méthode: methode,
  moyenDePoursuite: transport,
  nombreIndividus: "11-100",
  nombreNids: 0,
  nombreOeufs: 3,
  surfaceHabitatDétruit: 42,
};

function byClassification<T>(entries: [string, T][]): ByClassification<Map<string, T>> {
  return { oiseau: new Map(entries), "faune non-oiseau": new Map(), flore: new Map() };
}

export const activites = byClassification(
  [activite, autreActivite].map((value) => [value["Identifiant Pitchou"], value]),
);
export const methodes = byClassification([[methode.Code, methode]]);
export const transports = byClassification([[transport.Code, transport]]);
