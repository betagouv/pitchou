import { createOdsFile, getODSTableRawContent, tableRawContentToObjects } from "@odfjs/odfjs";
import type {
  ClassificationEtreVivant,
  EspèceProtégée,
  ParClassification,
  EspèceProtégéeStrings,
  TAXREF_ROW,
  OiseauAtteint,
  FloreAtteinte,
  FauneNonOiseauAtteinte,
  DescriptionMenacesEspèces,
  DescriptionMenaceEspèceJSON,
  ActivitéMenançante,
  MéthodeMenançante,
  MoyenDePoursuiteMenaçant,
  ImpactQuantifié,
} from "../types/especes.d.ts";
import type { default as EspeceProtegee } from "../types/database/public/EspeceProtegee.ts";
import type {
  FauneNonOiseauAtteinteOds_V1,
  FichierEspècesImpactéesOds_V1,
  FloreAtteinteOds_V1,
  OiseauAtteintOds_V1,
} from "../types/espècesFichierOds.d.ts";
import type { PitchouState } from "../front-end/store.svelte.ts";

const classificationEtreVivants: Set<"oiseau" | "faune non-oiseau" | "flore"> = new Set([
  "oiseau",
  "faune non-oiseau",
  "flore",
]);

export function isClassif(x: string): x is ClassificationEtreVivant {
  // @ts-ignore
  return classificationEtreVivants.has(x);
}

export function TAXREF_ROWClassification({ REGNE, CLASSE }: TAXREF_ROW): ClassificationEtreVivant {
  if (REGNE === "Plantae" || REGNE === "Fungi" || REGNE === "Chromista") {
    return "flore";
  }

  if (REGNE === "Animalia") {
    if (CLASSE === "Aves") {
      return "oiseau";
    } else {
      return "faune non-oiseau";
    }
  }

  throw new TypeError(`Classification non reconnue pour REGNE ${REGNE} et CLASSE ${CLASSE}`);
}

export function nomsVernaculaires(NOM_VERN: TAXREF_ROW["NOM_VERN"]): string[] {
  if (NOM_VERN === "") return [];
  return NOM_VERN.split(",").map((n) => n.trim());
}

export function espèceLabel(espèce: EspèceProtégée): string {
  return `${[...espèce.nomsVernaculaires][0]} (${[...espèce.nomsScientifiques][0]})`;
}

export function espèceProtégéeStringToEspèceProtégée({
  CD_REF,
  CD_TYPE_STATUTS,
  classification,
  nomsScientifiques,
  nomsVernaculaires,
  espèceCNPN,
  espèceMinistérielle,
}: EspèceProtégéeStrings): EspèceProtégée {
  if (!isClassif(classification)) {
    throw new TypeError(
      `Classification d'espèce non reconnue: ${classification}. Les choix sont : ${[...classificationEtreVivants].join(", ")}`,
    );
  }

  return {
    CD_REF,
    //@ts-ignore trusting data generation
    CD_TYPE_STATUTS: new Set(CD_TYPE_STATUTS.split(",")),
    //@ts-ignore trusting data generation
    classification,
    nomsScientifiques: new Set(nomsScientifiques.split(",")),
    nomsVernaculaires: new Set(nomsVernaculaires.split(",")),
    espèceCNPN: espèceCNPN === "O" ? espèceCNPN : undefined,
    espèceMinistérielle: espèceMinistérielle === "O" ? espèceMinistérielle : undefined,
  };
}

/**
 * Converts a raw `espece_protegee` database row into the domain `EspèceProtégée`.
 * `text[]` columns become `Set<…>` and booleans become `"O" | undefined`, keeping
 * the shape consumed by the rest of the app unchanged. Works both server-side (knex
 * rows) and client-side (rows deserialized from the API as plain JSON).
 */
export function dbRowToEspeceProtegee(row: EspeceProtegee): EspèceProtégée {
  const { classification } = row;

  if (!isClassif(classification)) {
    throw new TypeError(
      `Classification d'espèce non reconnue: ${classification}. Les choix sont : ${[...classificationEtreVivants].join(", ")}`,
    );
  }

  return {
    CD_REF: row.cd_ref,
    classification,
    nomsScientifiques: new Set(row.noms_scientifiques),
    nomsVernaculaires: new Set(row.noms_vernaculaires),
    //@ts-ignore trusting data generation
    CD_TYPE_STATUTS: new Set(row.cd_type_statuts),
    espèceMinistérielle: row.espece_ministerielle ? "O" : undefined,
    espèceCNPN: row.espece_cnpn ? "O" : undefined,
  };
}

function toSheetRawCellContent(x: undefined | null | number | string | boolean) {
  if (x === undefined || x === null || Number.isNaN(x)) return { type: "string", value: "" };

  if (typeof x === "number") return { type: "float", value: x };

  if (typeof x === "string") return { type: "string", value: x };

  return { type: "string", value: String(x) };
}

function oiseauxAtteintsToTableContent(oiseauxAtteints: OiseauAtteint[]) {
  const sheetRawContent = [
    [
      "noms vernaculaires",
      "noms scientifique",
      "CD_REF",
      "nombre individus",
      "nids",
      "œufs",
      "surface habitat détruit",
      "activité",
      "identifiant pitchou activité",
      "code activité",
      "méthode",
      "code méthode",
      "transport",
      "code transport",
    ].map(toSheetRawCellContent),
  ];

  for (const {
    espèce: { nomsScientifiques, nomsVernaculaires, CD_REF },
    nombreIndividus,
    nombreNids,
    nombreOeufs,
    surfaceHabitatDétruit,
    activité,
    méthode,
    moyenDePoursuite,
  } of oiseauxAtteints) {
    const labelActivité = activité && activité["Libellé Pitchou"];
    const identifiantPitchouActivité = activité && activité["Identifiant Pitchou"];
    const codeEuropeActivité = activité && activité["Code rapportage européen"];
    const labelMéthode = méthode && méthode["Libellé Pitchou"];
    const codeMéthode = méthode && méthode.Code;
    const labelMoyenDePoursuite = moyenDePoursuite && moyenDePoursuite["Libellé Pitchou"];
    const codeMoyenDePoursuite = moyenDePoursuite && moyenDePoursuite.Code;

    sheetRawContent.push(
      [
        [...nomsVernaculaires].join(", "),
        [...nomsScientifiques].join(", "),
        CD_REF,
        nombreIndividus,
        nombreNids,
        nombreOeufs,
        surfaceHabitatDétruit,
        labelActivité,
        identifiantPitchouActivité,
        codeEuropeActivité,
        labelMéthode,
        codeMéthode,
        labelMoyenDePoursuite,
        codeMoyenDePoursuite,
      ].map(toSheetRawCellContent),
    );
  }

  return sheetRawContent;
}

function faunesNonOiseauAtteintesToTableContent(
  faunesNonOiseauAtteintes: FauneNonOiseauAtteinte[],
) {
  const sheetRawContent = [
    [
      "noms vernaculaires",
      "noms scientifique",
      "CD_REF",
      "nombre individus",
      "surface habitat détruit",
      "activité",
      "identifiant pitchou activité",
      "code activité",
      "méthode",
      "code méthode",
      "transport",
      "code transport",
    ].map(toSheetRawCellContent),
  ];

  for (const {
    espèce: { nomsScientifiques, nomsVernaculaires, CD_REF },
    nombreIndividus,
    surfaceHabitatDétruit,
    activité,
    méthode,
    moyenDePoursuite,
  } of faunesNonOiseauAtteintes) {
    const labelActivité = activité && activité["Libellé Pitchou"];
    const identifiantPitchouActivité = activité && activité["Identifiant Pitchou"];
    const codeEuropeActivité = activité && activité["Code rapportage européen"];
    const labelMéthode = méthode && méthode["Libellé Pitchou"];
    const codeMéthode = méthode && méthode.Code;
    const labelMoyenDePoursuite = moyenDePoursuite && moyenDePoursuite["Libellé Pitchou"];
    const codeMoyenDePoursuite = moyenDePoursuite && moyenDePoursuite.Code;

    sheetRawContent.push(
      [
        [...nomsVernaculaires].join(", "),
        [...nomsScientifiques].join(", "),
        CD_REF,
        nombreIndividus,
        surfaceHabitatDétruit,
        labelActivité,
        identifiantPitchouActivité,
        codeEuropeActivité,
        labelMéthode,
        codeMéthode,
        labelMoyenDePoursuite,
        codeMoyenDePoursuite,
      ].map(toSheetRawCellContent),
    );
  }

  return sheetRawContent;
}

function floresAtteintesToTableContent(floresAtteintes: FloreAtteinte[]) {
  const sheetRawContent = [
    [
      "noms vernaculaires",
      "noms scientifique",
      "CD_REF",
      "nombre individus",
      "surface habitat détruit",
      "activité",
      "identifiant pitchou activité",
      "code activité",
    ].map(toSheetRawCellContent),
  ];

  for (const {
    espèce: { nomsScientifiques, nomsVernaculaires, CD_REF },
    nombreIndividus,
    surfaceHabitatDétruit,
    activité,
  } of floresAtteintes) {
    const labelActivité = activité && activité["Libellé Pitchou"];
    const identifiantPitchouActivité = activité && activité["Identifiant Pitchou"];
    const codeEuropeActivité = activité && activité["Code rapportage européen"];

    sheetRawContent.push(
      [
        [...nomsVernaculaires].join(", "),
        [...nomsScientifiques].join(", "),
        CD_REF,
        nombreIndividus,
        surfaceHabitatDétruit,
        labelActivité,
        identifiantPitchouActivité,
        codeEuropeActivité,
      ].map(toSheetRawCellContent),
    );
  }

  return sheetRawContent;
}

export function descriptionMenacesEspècesToOdsArrayBuffer(
  descriptionMenacesEspèces: DescriptionMenacesEspèces,
): Promise<ArrayBuffer> {
  const odsContent = new Map();

  if (descriptionMenacesEspèces["oiseau"].length >= 1) {
    odsContent.set("oiseau", oiseauxAtteintsToTableContent(descriptionMenacesEspèces["oiseau"]));
  }

  if (descriptionMenacesEspèces["faune non-oiseau"].length >= 1) {
    odsContent.set(
      "faune non-oiseau",
      faunesNonOiseauAtteintesToTableContent(descriptionMenacesEspèces["faune non-oiseau"]),
    );
  }

  if (descriptionMenacesEspèces["flore"].length >= 1) {
    odsContent.set("flore", floresAtteintesToTableContent(descriptionMenacesEspèces["flore"]));
  }

  odsContent.set("metadata", [
    ["version fichier", "version TaxRef", "schema rapportage européen"].map(toSheetRawCellContent),
    ["1.1.0", "17.0", "http://dd.eionet.europa.eu/schemas/habides-2.0/derogations.xsd"].map(
      toSheetRawCellContent,
    ),
  ]);

  return createOdsFile(odsContent);
}

function descriptionMenacesEspècesFromJSON(
  descriptionMenacesEspècesJSON: DescriptionMenaceEspèceJSON[],
  espèceByCD_REF: Map<EspèceProtégée["CD_REF"], EspèceProtégée>,
  activites: ParClassification<Map<ActivitéMenançante["Identifiant Pitchou"], ActivitéMenançante>>,
  methodes: ParClassification<Map<MéthodeMenançante["Code"], MéthodeMenançante>>,
  moyensDePoursuite: ParClassification<
    Map<MoyenDePoursuiteMenaçant["Code"], MoyenDePoursuiteMenaçant>
  >,
): DescriptionMenacesEspèces {
  const descriptionMenacesEspèces: DescriptionMenacesEspèces = Object.create(null);

  descriptionMenacesEspècesJSON.forEach(({ classification, etresVivantsAtteints }) => {
    //@ts-ignore
    descriptionMenacesEspèces[classification] = etresVivantsAtteints.map(
      //@ts-ignore
      ({ espèce, espece, activité, méthode, moyenDePoursuite, ...rest }) => {
        //@ts-expect-error TS ne comprend pas que si `espèce` n'est pas
        // renseigné alors `espece` l'est forcément
        const espèceParamDéprécié = espèceByCD_REF.get(espece);

        return {
          espèce: espèceByCD_REF.get(espèce) || espèceParamDéprécié,
          // @ts-ignore
          activité: activites[classification].get(activité),
          méthode: methodes[classification].get(méthode),
          moyenDePoursuite: moyensDePoursuite[classification].get(moyenDePoursuite),
          ...rest,
        };
      },
    );
  });

  return descriptionMenacesEspèces;
}

function b64ToUTF8(s: string): string {
  return decodeURIComponent(escape(atob(s)));
}

export function importDescriptionMenacesEspècesFromURL(
  url: URL,
  espèceByCD_REF: Map<EspèceProtégée["CD_REF"], EspèceProtégée>,
  activites: ParClassification<Map<ActivitéMenançante["Identifiant Pitchou"], ActivitéMenançante>>,
  methodes: ParClassification<Map<MéthodeMenançante["Code"], MéthodeMenançante>>,
  moyensDePoursuite: ParClassification<
    Map<MoyenDePoursuiteMenaçant["Code"], MoyenDePoursuiteMenaçant>
  >,
): DescriptionMenacesEspèces | undefined {
  const urlData = url.searchParams.get("data");
  if (urlData) {
    try {
      const data = JSON.parse(b64ToUTF8(urlData));
      const desc = descriptionMenacesEspècesFromJSON(
        data,
        espèceByCD_REF,
        activites,
        methodes,
        moyensDePoursuite,
      );
      return desc;
    } catch (e) {
      console.error("Parsing error", e, urlData);
      return undefined;
    }
  }
}

function ligneEspèceImpactéeHasCD_REF(
  espèceImpactée: OiseauAtteintOds_V1 | FauneNonOiseauAtteinteOds_V1 | FloreAtteinteOds_V1,
): boolean {
  return !!espèceImpactée.CD_REF;
}

async function importDescriptionMenacesEspècesFromOdsArrayBuffer_version_1(
  odsFile: ArrayBuffer,
  espèceByCD_REF: Map<EspèceProtégée["CD_REF"], EspèceProtégée>,
  activites: ParClassification<Map<ActivitéMenançante["Identifiant Pitchou"], ActivitéMenançante>>,
  methodes: ParClassification<Map<MéthodeMenançante["Code"], MéthodeMenançante>>,
  moyensDePoursuite: ParClassification<
    Map<MoyenDePoursuiteMenaçant["Code"], MoyenDePoursuiteMenaçant>
  >,
): Promise<DescriptionMenacesEspèces> {
  const descriptionMenacesEspèces: DescriptionMenacesEspèces = Object.create(null);

  const odsRawContent = await getODSTableRawContent(odsFile);
  const odsContent = tableRawContentToObjects(odsRawContent) as FichierEspècesImpactéesOds_V1;

  let lignesOiseauOds = odsContent.get("oiseau");
  let lignesFauneNonOiseauOds =
    odsContent.get("faune non-oiseau") || odsContent.get("faune_non-oiseau");
  let lignesFloreOds = odsContent.get("flore");

  lignesOiseauOds = lignesOiseauOds && lignesOiseauOds.filter(ligneEspèceImpactéeHasCD_REF);
  lignesFauneNonOiseauOds =
    lignesFauneNonOiseauOds && lignesFauneNonOiseauOds.filter(ligneEspèceImpactéeHasCD_REF);
  lignesFloreOds = lignesFloreOds && lignesFloreOds.filter(ligneEspèceImpactéeHasCD_REF);

  if (
    !(lignesOiseauOds && lignesOiseauOds.length >= 1) &&
    !(lignesFauneNonOiseauOds && lignesFauneNonOiseauOds.length >= 1) &&
    !(lignesFloreOds && lignesFloreOds.length >= 1)
  ) {
    throw new Error(
      "Le fichier espèces .ods semble ne contenir aucune feuille oiseau, faune non-oiseau ou flore.",
      { cause: "format incorrect" },
    );
  }

  if (lignesOiseauOds && lignesOiseauOds.length >= 1) {
    // recups les infos depuis les colonnes
    descriptionMenacesEspèces["oiseau"] = lignesOiseauOds.map((ligneOiseauOds) => {
      const {
        CD_REF,
        "nombre individus": nombreIndividus,
        nids: nombreNids,
        œufs: nombreOeufs,
        "surface habitat détruit": surfaceHabitatDétruit,
        "code activité": codeActivité,
        "code méthode": codeMéthode,
        "code transport": moyenDePoursuite,
      } = ligneOiseauOds;
      let identifiantPitchouActivité = ligneOiseauOds["identifiant pitchou activité"];

      const espèce = espèceByCD_REF.get(CD_REF);

      if (!espèce) {
        throw new Error(`Espèce avec CD_REF ${CD_REF} manquante`);
      }

      //Si aucun identifiant pitchou activité n'a été trouvé pour la ligne, il s'agit d'un fichier espèce avec un format legacy. Dans ce cas, on essaie de "deviner" l'identifiant Pitchou Activité à partir du code activité.
      if (!identifiantPitchouActivité) {
        if (codeActivité === "4") {
          if ((nombreOeufs && nombreOeufs > 0) || (nombreNids && nombreNids > 0)) {
            // Destruction de nids/oeufs
            identifiantPitchouActivité = "P-4-1";
          } else {
            // Dégradation/destruction d’aires de repos/reproduction
            identifiantPitchouActivité = "P-4-2";
          }
        } else if (codeActivité == "2") {
          // Capture pour captivité temporaire ou définitive
          identifiantPitchouActivité = "P-2-1";
        } else {
          identifiantPitchouActivité = `P-${codeActivité}`;
        }
      }

      return {
        espèce,
        nombreIndividus,
        nombreNids,
        nombreOeufs,
        surfaceHabitatDétruit,
        activité: activites["oiseau"].get(identifiantPitchouActivité),
        méthode: methodes["oiseau"].get(codeMéthode),
        moyenDePoursuite: moyensDePoursuite["oiseau"].get(moyenDePoursuite),
      };
    });
  }

  if (lignesFauneNonOiseauOds && lignesFauneNonOiseauOds.length >= 1) {
    // recups les infos depuis les colonnes
    descriptionMenacesEspèces["faune non-oiseau"] = lignesFauneNonOiseauOds.map(
      (ligneFauneNonOiseauOds) => {
        const {
          CD_REF,
          "nombre individus": nombreIndividus,
          "surface habitat détruit": surfaceHabitatDétruit,
          "code activité": codeActivité,
          "code méthode": codeMéthode,
          "code transport": codeMoyenDePoursuite,
        } = ligneFauneNonOiseauOds;
        let identifiantPitchouActivité = ligneFauneNonOiseauOds["identifiant pitchou activité"];

        const espèce = espèceByCD_REF.get(CD_REF);

        if (!espèce) {
          throw new Error(`Espèce avec CD_REF ${CD_REF} manquante`);
        }

        if (!identifiantPitchouActivité) {
          if (codeActivité === "70") {
            // Moyen de poursuite de spécimens vivants ou morts
            identifiantPitchouActivité = "P-70-2";
          } else {
            identifiantPitchouActivité = `P-${codeActivité}`;
          }
        }

        return {
          espèce,
          nombreIndividus,
          surfaceHabitatDétruit,
          activité: activites["faune non-oiseau"].get(identifiantPitchouActivité),
          méthode: methodes["faune non-oiseau"].get(codeMéthode),
          moyenDePoursuite: moyensDePoursuite["faune non-oiseau"].get(codeMoyenDePoursuite),
        };
      },
    );
  }

  if (lignesFloreOds && lignesFloreOds.length >= 1) {
    // recups les infos depuis les colonnes
    descriptionMenacesEspèces["flore"] = lignesFloreOds.map((ligneFloreOds) => {
      const {
        CD_REF,
        "nombre individus": nombreIndividus,
        "surface habitat détruit": surfaceHabitatDétruit,
        "code activité": codeActivité,
        "identifiant pitchou activité": identifiantPitchouActivité,
      } = ligneFloreOds;

      const espèce = espèceByCD_REF.get(CD_REF);

      if (!espèce) {
        throw new Error(`Espèce avec CD_REF ${CD_REF} manquante`);
      }

      return {
        espèce,
        nombreIndividus,
        surfaceHabitatDétruit,
        activité: activites["flore"].get(identifiantPitchouActivité || `P-${codeActivité}`),
      };
    });
  }

  return descriptionMenacesEspèces;
}

export async function construireActivitésMéthodesMoyensDePoursuite(
  odsData: Buffer,
): Promise<NonNullable<PitchouState["ActivitésMéthodesMoyensDePoursuite"]>> {
  const ActivitésMéthodesMoyensDePoursuiteBruts =
    await getODSTableRawContent(odsData).then(tableRawContentToObjects);

  // Les lignes sont réassignées dans des nouveaux objets pour qu'ils aient la méthode `Object.prototype.toString`
  // utilisée par Svelte

  const activitésBrutes: ParClassification<ActivitéMenançante[]> = {
    oiseau: ActivitésMéthodesMoyensDePoursuiteBruts.get("Activités oiseau")!.map((row) =>
      Object.assign({}, row),
    ),
    "faune non-oiseau": ActivitésMéthodesMoyensDePoursuiteBruts.get(
      "Activités faune non oiseau",
    )!.map((row) => Object.assign({}, row)),
    flore: ActivitésMéthodesMoyensDePoursuiteBruts.get("Activités flore")!.map((row) =>
      Object.assign({}, row),
    ),
  };

  const méthodesBrutes: MéthodeMenançante[] = ActivitésMéthodesMoyensDePoursuiteBruts.get(
    "Méthodes",
  )!.map((row) => Object.assign({}, row));
  const moyensPoursuite: MoyenDePoursuiteMenaçant[] = ActivitésMéthodesMoyensDePoursuiteBruts.get(
    "Moyens de poursuite",
  )!.map((row) => Object.assign({}, row));

  const ActivitésMéthodesMoyensDePoursuite = actMetTransArraysToMapBundle(
    activitésBrutes,
    méthodesBrutes,
    moyensPoursuite,
  );

  const identifiantPitchouVersActivitéEtImpactsQuantifiés = new Map(
    Object.values(ActivitésMéthodesMoyensDePoursuite.activités).flatMap((activités) => {
      return [...activités.entries()].map(([code, activité]) => {
        const impactsQuantifiés: ImpactQuantifié[] = [
          "Nombre d'individus",
          "Nids",
          "Œufs",
          "Surface habitat détruit (m²)",
        ];

        const impactsQuantifiésFiltrés = impactsQuantifiés.filter((donnéeSecondaire) => {
          return activité[donnéeSecondaire] === "Oui";
        });

        const ret: [
          ActivitéMenançante["Identifiant Pitchou"],
          ActivitéMenançante & { impactsQuantifiés: ImpactQuantifié[] },
        ] = [code, { ...activité, impactsQuantifiés: impactsQuantifiésFiltrés }];
        return ret;
      });
    }),
  );

  const ret = {
    identifiantPitchouVersActivitéEtImpactsQuantifiés,
    ...ActivitésMéthodesMoyensDePoursuite,
  };

  return ret;
}

export function actMetTransArraysToMapBundle(
  activitésBrutes: ParClassification<ActivitéMenançante[]>,
  méthodesBrutes: MéthodeMenançante[],
  moyensDePoursuiteBruts: MoyenDePoursuiteMenaçant[],
): {
  activités: ParClassification<Map<ActivitéMenançante["Identifiant Pitchou"], ActivitéMenançante>>;
  méthodes: ParClassification<Map<MéthodeMenançante["Code"], MéthodeMenançante>>;
  moyensDePoursuite: ParClassification<
    Map<MoyenDePoursuiteMenaçant["Code"], MoyenDePoursuiteMenaçant>
  >;
} {
  const activités: ParClassification<
    Map<ActivitéMenançante["Code rapportage européen"], ActivitéMenançante>
  > = {
    oiseau: new Map(),
    "faune non-oiseau": new Map(),
    flore: new Map(),
  };

  for (const classification in activitésBrutes) {
    // @ts-ignore
    const activitéBruteClassification: ActivitéMenançante[] = activitésBrutes[classification];
    for (const activité of activitéBruteClassification) {
      if (activité["Identifiant Pitchou"] === undefined || activité["Identifiant Pitchou"] === "") {
        // ignore empty lines (certainly comments)
        break;
      }

      activité["Code rapportage européen"] = activité["Code rapportage européen"].toString();
      // @ts-ignore
      activités[classification].set(activité["Identifiant Pitchou"], activité);
    }
  }

  const méthodes: ParClassification<Map<MéthodeMenançante["Code"], MéthodeMenançante>> = {
    oiseau: new Map(),
    "faune non-oiseau": new Map(),
    flore: new Map(),
  };

  for (const methode of méthodesBrutes) {
    const classif = methode["Espèces"];

    if (!classif.trim() && (methode["Code"] === undefined || methode["Code"] === "")) {
      // ignore empty lines (certainly comments)
      break;
    }

    if (!isClassif(classif)) {
      throw new TypeError(`Classification d'espèce non reconnue : ${classif}`);
    }

    methode["Code"] = methode["Code"].toString();

    const classifMeth = méthodes[classif];
    Object.freeze(methode);
    classifMeth.set(methode.Code, methode);
    méthodes[classif] = classifMeth;
  }

  const moyensDePoursuite: ParClassification<
    Map<MoyenDePoursuiteMenaçant["Code"], MoyenDePoursuiteMenaçant>
  > = {
    oiseau: new Map(),
    "faune non-oiseau": new Map(),
    flore: new Map(),
  };

  for (const moyenDePoursuite of moyensDePoursuiteBruts) {
    const classif = moyenDePoursuite["Espèces"];

    if (
      !classif.trim() &&
      (moyenDePoursuite["Code"] === undefined || moyenDePoursuite["Code"] === "")
    ) {
      // ignore empty lines (certainly comments)
      break;
    }

    if (!isClassif(classif)) {
      throw new TypeError(`Classification d'espèce non reconnue : ${classif}.}`);
    }

    moyenDePoursuite["Code"] = moyenDePoursuite["Code"].toString();

    const classifTrans = moyensDePoursuite[classif];
    Object.freeze(moyenDePoursuite);
    classifTrans.set(moyenDePoursuite.Code, moyenDePoursuite);
    moyensDePoursuite[classif] = classifTrans;
  }

  return {
    activités,
    méthodes,
    moyensDePoursuite,
  };
}

export const importDescriptionMenacesEspècesFromOdsArrayBuffer =
  importDescriptionMenacesEspècesFromOdsArrayBuffer_version_1;
