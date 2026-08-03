import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createDossier, createInstructeurWithCapToGroup } from "../factories/index.ts";
import { physicalAdminDossierRelations } from "../factories/adminDossier.ts";
import {
  createDossierFromAdmin,
  DN_DERIVED_DOSSIER_COLUMNS,
  updateDossierFromAdmin,
} from "@pitchou/server/database/dossier_admin.ts";
import { getDossierDetailForAdmin } from "@pitchou/server/database/dossier_admin_list.ts";
import {
  dossierMainActiviteOptions,
  motifDerogationOptions,
  scientifiqueDemandePurposeOptions,
  scientifiqueDemandeTypeOptions,
} from "@pitchou/common/dossierFormOptions.ts";

import type { DossierId, DossierMutator } from "@pitchou/types/database/public/Dossier.ts";
import type { GroupeInstructeursId } from "@pitchou/types/database/public/GroupeInstructeurs.ts";

const ADMIN_EMAIL = "admin-parity@pitchou.test";
const communes = [{ name: "Lyon", code: "69123", postalCode: "69001" }];
const projetMap = {
  type: "FeatureCollection",
  features: [{ type: "Feature", geometry: { type: "Point", coordinates: [4.83, 45.76] } }],
};
const intervenants = [{ nom_complet: "Camille Martin", qualification: "Ecologue" }];

const allDnColumns = {
  name: "Dossier complet",
  description: "Description complète",
  depot_date: new Date("2026-07-10"),
  main_activite: dossierMainActiviteOptions[0],
  type: "Hirondelle",
  intervention_start_date: new Date("2026-08-01"),
  intervention_end_date: new Date("2026-08-31"),
  commissioning_date: new Date("2026-09-01"),
  intervention_duration: 12.5,
  communes: JSON.stringify(communes),
  departments: JSON.stringify(["69"]),
  regions: JSON.stringify(["Auvergne-Rhône-Alpes"]),
  location_scope: "communes",
  primary_department: "69",
  projet_map: JSON.stringify(projetMap),
  linked_to_ae_regime: true,
  ae_procedures: JSON.stringify(["Autorisation ICPE"]),
  ae_other_procedure: "Procédure locale",
  limited_specimen_type: "Espèces autres que oiseaux",
  scientifique_mortality_measures_taken: true,
  scientifique_mortality_measures_details: "Bridage supplémentaire",
  eolien_commissioning_year: 2020,
  eolien_turbines_count: 8,
  eolien_tip_height: 180.5,
  eolien_rotor_diameter: 120.25,
  eolien_ground_clearance: 30.75,
  eolien_monitored_turbines_count: 6,
  eolien_field_inventory_period: "Mars à octobre",
  eolien_monitoring_visits_count: 24,
  eolien_weekly_monitoring_visits_count: 2,
  eolien_mortality_actions: JSON.stringify([
    "Transport des individus blessés vers un centre de soin",
  ]),
  eolien_carcass_collection_method: "Collecte quotidienne",
  eolien_carcass_preservation_method: "Conservation réfrigérée",
  eolien_carcass_examination_address: "11 rue Réaumur, Paris",
  mesures_erc_planned: false,
  ecological_inventory_completed: true,
  especes_present_in_influence_area: true,
  risk_despite_erc_mesures: false,
  no_other_satisfactory_solution_justification: "Aucune autre solution",
  motif_derogation: motifDerogationOptions[0],
  motif_derogation_justification: "Motif justifié",
  dossier_oiseau_simple_destroyed_nids_count: 3,
  dossier_oiseau_simple_compensated_nids_count: 6,
  scientifique_demande_type: JSON.stringify([scientifiqueDemandeTypeOptions[0]]),
  scientifique_demande_purposes: JSON.stringify([scientifiqueDemandePurposeOptions[0]]),
  scientifique_previous_assessment: true,
  scientifique_suivi_protocol_description: "Protocole",
  scientifique_capture_mode: JSON.stringify(["Manuelle", "Piège adapté"]),
  scientifique_light_source_conditions: "Éclairage limité",
  scientifique_marking_conditions: "Marquage temporaire",
  scientifique_transport_conditions: "Transport ventilé",
  scientifique_intervention_perimeter: "Métropole de Lyon",
  scientifique_intervenants: JSON.stringify(intervenants),
  scientifique_other_intervenants_details: "Participation de bénévoles",
} as unknown as DossierMutator;

test("all DN intake columns round-trip on a native dossier", async () => {
  const instructeur = await createInstructeurWithCapToGroup(db);
  const { id } = await createDossierFromAdmin(
    {
      name: "Dossier initial",
      depot_date: new Date("2026-07-01"),
      phase: "Accompagnement amont",
      relations: physicalAdminDossierRelations(
        instructeur.groupeId as GroupeInstructeursId,
        "Martin",
        "Camille",
      ),
    },
    ADMIN_EMAIL,
    db,
  );

  await updateDossierFromAdmin(id, { columns: allDnColumns }, ADMIN_EMAIL, db);
  const { dossier } = await getDossierDetailForAdmin(id, db);

  expect(dossier).toMatchObject({
    name: "Dossier complet",
    main_activite: dossierMainActiviteOptions[0],
    type: "Hirondelle",
    intervention_duration: 12.5,
    linked_to_ae_regime: true,
    mesures_erc_planned: false,
    motif_derogation: motifDerogationOptions[0],
    scientifique_previous_assessment: true,
    location_scope: "communes",
  });
  expect(dossier.communes).toEqual(communes);
  expect(dossier.departments).toEqual(["69"]);
  expect(dossier.regions).toEqual(["Auvergne-Rhône-Alpes"]);
  expect(dossier.projet_map).toEqual(projetMap);
  expect(dossier.scientifique_intervenants).toEqual(intervenants);
  expect(dossier.scientifique_capture_mode).toEqual(["Manuelle", "Piège adapté"]);
});

test("every DN intake column is rejected on a synchronized dossier", async () => {
  const dossier = await createDossier(db, { demarche_numerique_number: "910200" });

  await expect(
    updateDossierFromAdmin(dossier.id as DossierId, { columns: allDnColumns }, ADMIN_EMAIL, db),
  ).rejects.toMatchObject({ fields: [...DN_DERIVED_DOSSIER_COLUMNS] });
});
