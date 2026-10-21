import type {
  ActiviteMenancante,
  ByClassification,
  DescriptionMenaceEspeceJSON,
  DescriptionMenacesEspeces,
  EspeceProtegee,
  MethodeMenancante,
  MoyenDePoursuiteMenacant,
  OiseauAtteintJSON,
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
    description[classification] = etresVivantsAtteints.map(
      ({
        espèce: cdRef,
        espece: legacyCdRef,
        activité: activite,
        méthode: methode,
        moyenDePoursuite,
        ...rest
      }: OiseauAtteintJSON) => {
        const espece =
          especeByCD_REF.get(cdRef) ?? (legacyCdRef ? especeByCD_REF.get(legacyCdRef) : undefined);
        if (!espece) throw new TypeError(`Espèce inconnue: ${cdRef ?? legacyCdRef}`);
        return {
          espèce: espece,
          activité: activite === undefined ? undefined : activites[classification].get(activite),
          méthode: methode === undefined ? undefined : methodes[classification].get(methode),
          moyenDePoursuite:
            moyenDePoursuite === undefined
              ? undefined
              : moyens[classification].get(moyenDePoursuite),
          ...rest,
        };
      },
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
