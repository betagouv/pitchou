import { json } from "@sveltejs/kit";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import { externalKeyIsUsable } from "@pitchou/server/database/externalApi/access.ts";
import { getTaxrefFiltres } from "@pitchou/server/taxref.ts";
import { getBdcStatutFiltres } from "@pitchou/server/bdcStatut.ts";
import { getEspecesProtegees } from "@pitchou/server/especeProtegee.ts";
import { getActiviteReferentiel } from "@pitchou/server/database/activite.ts";
import { getReferentielRows } from "@pitchou/server/referentielTypeImpactMethodeMoyenDePoursuite.ts";
import { getPublicStats } from "@pitchou/server/database/stats.ts";
import { indicatorsAARRI } from "@pitchou/server/database/aarri.ts";
import { referenceReadScope } from "@pitchou/types/externalApi.ts";
import { readBdcStatuts, readTaxref } from "./search.ts";
import { withApiScope } from "./read.ts";
import { apiProblem } from "./responses.ts";

export const referenceResources = {
  taxref: readTaxref,
  "taxref-filters": async () => {
    const { regnes: kingdoms, classes } = await getTaxrefFiltres();
    return { kingdoms, classes };
  },
  "bdc-statuts": readBdcStatuts,
  "bdc-statuts-filters": async () => ({ statuses: (await getBdcStatutFiltres()).statuts }),
  "especes-protegees": readProtectedEspeces,
  activites: () => getActiviteReferentiel(),
  "impacts-especes": readEspeceImpactReferences,
  stats: readStats,
  aarri: readAarri,
};

async function readProtectedEspeces() {
  return (await getEspecesProtegees()).map(
    ({
      noms_scientifiques: scientificNames,
      noms_vernaculaires: commonNames,
      cd_type_statuts: statusTypeCodes,
      statut_liste_rouge: redListStatus,
      statuts_protection: protectionStatuses,
      ...espece
    }) => ({
      ...espece,
      scientific_names: scientificNames,
      common_names: commonNames,
      status_type_codes: statusTypeCodes,
      red_list_status: redListStatus,
      protection_statuses: protectionStatuses.map(
        ({ cd_type_statut: statusTypeCode, documents }) => ({
          status_type_code: statusTypeCode,
          documents,
        }),
      ),
    }),
  );
}

type ImpactReference = {
  classification: string;
  libelle_pitchou: string;
  libelle_europeen: string;
};

function formatImpactReference(row: ImpactReference) {
  return {
    classification: row.classification,
    pitchou_label: row.libelle_pitchou,
    european_label: row.libelle_europeen,
  };
}

async function readEspeceImpactReferences() {
  const {
    typesImpact: impactTypes,
    methodes: methods,
    moyensDePoursuite,
  } = await getReferentielRows();
  return {
    impact_types: impactTypes.map((impact) => ({
      ...formatImpactReference(impact),
      pitchou_id: impact.identifiant_pitchou,
      european_code: impact.code_europeen,
      onagre_activites: impact.activites_onagre,
      allows_method: impact.critere_methode,
      allows_moyen_de_poursuite: impact.critere_moyen_de_poursuite,
      allows_individual_count: impact.critere_nombre_individus,
      allows_nest_count: impact.critere_nids,
      allows_egg_count: impact.critere_oeufs,
      allows_destroyed_habitat_area: impact.critere_surface_habitat_detruit,
    })),
    methods: methods.map((row) => ({ code: row.code, ...formatImpactReference(row) })),
    moyens_de_poursuite: moyensDePoursuite.map((row) => ({
      code: row.code,
      ...formatImpactReference(row),
    })),
  };
}

async function readStats() {
  const { conformiteStats, biodiversiteImpactStats, ...counts } = await getPublicStats();
  return {
    ...counts,
    complianceStats: {
      nonCompliantPrescriptionCount: conformiteStats.nonConformePrescriptionCount,
      tooLatePrescriptionCount: conformiteStats.tooLatePrescriptionCount,
      prescriptionCompliantAfterFirstControleCount:
        conformiteStats.prescriptionConformeAfterFirstControleCount,
      prescriptionCompliantAfterSecondControleCount:
        conformiteStats.prescriptionConformeAfterSecondControleCount,
      prescriptionCompliantAfterThirdControleCount:
        conformiteStats.prescriptionConformeAfterThirdControleCount,
      prescriptionReturnedToComplianceCount: conformiteStats.prescriptionReturnedToConformiteCount,
    },
    biodiversityImpactStats: {
      compliantPrescriptionCount: biodiversiteImpactStats.conformePrescriptionCount,
      avoidedSurfaceTotal: biodiversiteImpactStats.avoidedSurfaceTotal,
      compensatedSurfaceTotal: biodiversiteImpactStats.compensatedSurfaceTotal,
      avoidedNestCount: biodiversiteImpactStats.avoidedNidsCount,
      compensatedNestCount: biodiversiteImpactStats.compensatedNidsCount,
      avoidedIndividualCount: biodiversiteImpactStats.avoidedIndividusCount,
      compensatedIndividualCount: biodiversiteImpactStats.compensatedIndividusCount,
    },
  };
}

async function readAarri() {
  return (await indicatorsAARRI()).map((row) => ({
    date: row.date,
    potential_user_count: row.nombreBaseUtilisateuricePotentielle,
    acquired_user_count: row.nombreUtilisateuriceAcquis,
    active_user_count: row.nombreUtilisateuriceActif,
    retained_user_count: row.nombreUtilisateuriceRetenu,
    impacted_user_count: row.nombreUtilisateuriceImpact,
  }));
}

export function withReferenceRead(locals: App.Locals, read: () => Promise<unknown>) {
  return withApiScope(locals, referenceReadScope, async (principal) => {
    if (!(await externalKeyIsUsable(principal, referenceReadScope, directDatabaseConnection))) {
      return apiProblem(401, "Authentification requise", { "WWW-Authenticate": "Bearer" });
    }
    const data = await read();
    return data instanceof Response ? data : json(data);
  });
}
