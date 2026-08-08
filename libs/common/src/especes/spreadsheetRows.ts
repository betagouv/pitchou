import type {
  FauneNonOiseauAtteinteOds_V1,
  FloreAtteinteOds_V1,
  OiseauAtteintOds_V1,
} from "@pitchou/types/especesFichierOds.d.ts";
import type { DescriptionMenacesEspeces, EspeceProtegee } from "@pitchou/types/especes.d.ts";
import type { ReferentielMaps } from "./types.ts";

type EspeceMap = Map<EspeceProtegee["CD_REF"], EspeceProtegee>;

function getEspece(cdRef: string, especes: EspeceMap): EspeceProtegee {
  const espece = especes.get(cdRef);
  if (!espece) throw new Error(`Espèce avec CD_REF ${cdRef} manquante`);
  return espece;
}

export function parseOiseaux(
  rows: OiseauAtteintOds_V1[],
  especes: EspeceMap,
  maps: ReferentielMaps,
): NonNullable<DescriptionMenacesEspeces["oiseau"]> {
  return rows.map((row) => {
    const {
      CD_REF,
      "nombre individus": nombreIndividus,
      nids: nombreNids,
      œufs: nombreOeufs,
      "surface habitat détruit": surfaceHabitatDetruit,
      "code activité": codeActivite,
      "code méthode": codeMethode,
      "code transport": codeMoyen,
    } = row;
    let activiteId = row["identifiant pitchou activité"];
    if (!activiteId) {
      if (codeActivite === "4") {
        activiteId =
          (nombreOeufs && nombreOeufs > 0) || (nombreNids && nombreNids > 0) ? "P-4-1" : "P-4-2";
      } else if (codeActivite == "2") {
        activiteId = "P-2-1";
      } else {
        activiteId = `P-${codeActivite}`;
      }
    }
    return {
      espèce: getEspece(CD_REF, especes),
      nombreIndividus,
      nombreNids,
      nombreOeufs,
      surfaceHabitatDétruit: surfaceHabitatDetruit,
      activité: maps.activites.oiseau.get(activiteId),
      méthode: maps.methodes.oiseau.get(codeMethode),
      moyenDePoursuite: maps.moyens.oiseau.get(codeMoyen),
    };
  });
}

export function parseFaunes(
  rows: FauneNonOiseauAtteinteOds_V1[],
  especes: EspeceMap,
  maps: ReferentielMaps,
): NonNullable<DescriptionMenacesEspeces["faune non-oiseau"]> {
  return rows.map((row) => {
    const {
      CD_REF,
      "nombre individus": nombreIndividus,
      "surface habitat détruit": surfaceHabitatDetruit,
      "code activité": codeActivite,
      "code méthode": codeMethode,
      "code transport": codeMoyen,
    } = row;
    let activiteId = row["identifiant pitchou activité"];
    if (!activiteId) activiteId = codeActivite === "70" ? "P-70-2" : `P-${codeActivite}`;
    return {
      espèce: getEspece(CD_REF, especes),
      nombreIndividus,
      surfaceHabitatDétruit: surfaceHabitatDetruit,
      activité: maps.activites["faune non-oiseau"].get(activiteId),
      méthode: maps.methodes["faune non-oiseau"].get(codeMethode),
      moyenDePoursuite: maps.moyens["faune non-oiseau"].get(codeMoyen),
    };
  });
}

export function parseFlores(
  rows: FloreAtteinteOds_V1[],
  especes: EspeceMap,
  maps: ReferentielMaps,
): NonNullable<DescriptionMenacesEspeces["flore"]> {
  return rows.map((row) => {
    const {
      CD_REF,
      "nombre individus": nombreIndividus,
      "surface habitat détruit": surfaceHabitatDetruit,
      "code activité": codeActivite,
      "identifiant pitchou activité": activiteId,
    } = row;
    return {
      espèce: getEspece(CD_REF, especes),
      nombreIndividus,
      surfaceHabitatDétruit: surfaceHabitatDetruit,
      activité: maps.activites.flore.get(activiteId || `P-${codeActivite}`),
    };
  });
}
