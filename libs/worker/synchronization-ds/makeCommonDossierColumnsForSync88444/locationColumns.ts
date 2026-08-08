import type {
  ChampDSCarte,
  ChampDSCommunes,
  ChampDSDepartement,
  ChampDSDepartements,
  ChampDSRegions,
  DossierDS88444,
} from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { Dossier88444ChampById, Dossier88444KeyMap } from "./fieldMaps.ts";

export function makeDossierLocationColumns88444(
  champs: DossierDS88444["champs"],
  champById: Dossier88444ChampById,
  keyToChamp: Dossier88444KeyMap,
) {
  const projetSitue = champById.get(keyToChamp.get("Le projet se situe au niveau…"))?.stringValue;
  const locationScope =
    projetSitue === `d'une ou plusieurs communes`
      ? "communes"
      : projetSitue === `d'un ou plusieurs départements`
        ? "departements"
        : projetSitue === `d'une ou plusieurs régions`
          ? "regions"
          : projetSitue === "de toute la France"
            ? "france"
            : null;
  const champCommunes: ChampDSCommunes = champById.get(
    keyToChamp.get("Commune(s) où se situe le projet"),
  );
  const champDepartements: ChampDSDepartements = champById.get(
    keyToChamp.get("Département(s) où se situe le projet"),
  );
  const primaryDepartment: ChampDSDepartement = champById.get(
    keyToChamp.get("Dans quel département se localise majoritairement votre projet ?"),
  );
  const champRegions: ChampDSRegions = champById.get(
    keyToChamp.get("Région(s) où se situe le projet"),
  );
  let communes;
  let departments;
  let regions;

  if (projetSitue === `d'une ou plusieurs communes` && champCommunes) {
    communes = champCommunes.rows.map((row) => row.champs[0].commune).filter(Boolean);
    if (communes.length >= 1) {
      departments = [
        ...new Set(
          champCommunes.rows.map((row) => row.champs[0].departement?.code).filter(Boolean),
        ),
      ];
    }
  } else if (projetSitue === `d'un ou plusieurs départements` && champDepartements) {
    departments = [
      ...new Set(champDepartements.rows.map((row) => row.champs[0].departement?.code)),
    ].filter(Boolean);
  } else if (projetSitue === `d'une ou plusieurs régions` && champRegions) {
    regions = [...new Set(champRegions.rows.map((row) => row.champs[0].stringValue))];
  } else if (projetSitue && projetSitue !== "de toute la France") {
    console.log("localisation manquante", projetSitue, champs);
    process.exit(1);
  }

  if (primaryDepartment?.departement && (!departments || departments.length === 0)) {
    departments = [primaryDepartment.departement.code];
  }
  const carteChamps = champs.filter((champ): champ is ChampDSCarte =>
    Array.isArray((champ as ChampDSCarte).geoAreas),
  );
  const features = carteChamps.flatMap((champ) =>
    champ.geoAreas.map((area) => ({
      type: "Feature",
      geometry: area.geometry,
      properties: { source: area.source, description: area.description ?? null },
    })),
  );
  return {
    communes: JSON.stringify(communes),
    departments: JSON.stringify(departments),
    regions: JSON.stringify(regions),
    location_scope: locationScope,
    primary_department: primaryDepartment?.departement?.code,
    projet_map: features.length ? JSON.stringify({ type: "FeatureCollection", features }) : null,
  };
}
