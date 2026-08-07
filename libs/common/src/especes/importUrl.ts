import type {
  ActiviteMenancante,
  ByClassification,
  DescriptionMenaceEspeceJSON,
  DescriptionMenacesEspeces,
  EspeceProtegee,
  MethodeMenancante,
  MoyenDePoursuiteMenacant,
} from "@pitchou/types/especes.d.ts";
import type { ReferentielMaps } from "./types.ts";

function descriptionFromJSON(
  rows: DescriptionMenaceEspeceJSON[],
  especeByCD_REF: Map<EspeceProtegee["CD_REF"], EspeceProtegee>,
  activites: ReferentielMaps["activites"],
  methodes: ReferentielMaps["methodes"],
  moyens: ReferentielMaps["moyens"],
): DescriptionMenacesEspeces {
  const description: DescriptionMenacesEspeces = Object.create(null);
  rows.forEach(({ classification, etresVivantsAtteints }) => {
    // @ts-ignore The discriminated arrays are indexed by their classification.
    description[classification] = etresVivantsAtteints.map(
      // @ts-ignore Supports both the current accented key and persisted legacy data.
      ({ espèce, espece, activité: activite, méthode: methode, moyenDePoursuite, ...rest }) => ({
        espèce: especeByCD_REF.get(espèce) || especeByCD_REF.get(espece),
        // @ts-ignore Classification determines the activity row type.
        activité: activites[classification].get(activite),
        méthode: methodes[classification].get(methode),
        moyenDePoursuite: moyens[classification].get(moyenDePoursuite),
        ...rest,
      }),
    );
  });
  return description;
}

export function importDescriptionMenacesEspecesFromURL(
  url: URL,
  especeByCD_REF: Map<EspeceProtegee["CD_REF"], EspeceProtegee>,
  activites: ByClassification<Map<ActiviteMenancante["Identifiant Pitchou"], ActiviteMenancante>>,
  methodes: ByClassification<Map<MethodeMenancante["Code"], MethodeMenancante>>,
  moyens: ByClassification<Map<MoyenDePoursuiteMenacant["Code"], MoyenDePoursuiteMenacant>>,
): DescriptionMenacesEspeces | undefined {
  const urlData = url.searchParams.get("data");
  if (!urlData) return undefined;
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(urlData))));
    return descriptionFromJSON(data, especeByCD_REF, activites, methodes, moyens);
  } catch (error) {
    console.error("Parsing error", error, urlData);
    return undefined;
  }
}
