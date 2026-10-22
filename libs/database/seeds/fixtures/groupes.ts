import { departements } from "@pitchou/common/departements.ts";

// Local coverage is independent of which dossiers happen to exist in the seed.
export const SEED_GROUPES = [
  {
    name: "Administrateur",
    departments: departements.map(({ code }) => code),
    active: true,
    coverage_needs_review: false,
  },
  { name: "Dév Pitchou", departments: ["99"], active: true, coverage_needs_review: false },
  {
    name: "DREAL Nouvelle-Aquitaine",
    departments: ["16", "17", "19", "23", "24", "33", "40", "47", "64", "79", "86", "87"],
    active: true,
    coverage_needs_review: false,
  },
  {
    name: "DREAL Occitanie",
    departments: ["09", "11", "12", "30", "31", "32", "34", "46", "48", "65", "66", "81", "82"],
    active: true,
    coverage_needs_review: false,
  },
  { name: "Multi-régions", departments: [], active: true, coverage_needs_review: true },
  { name: "DDT02 -  AISNE", departments: ["02"], active: true, coverage_needs_review: false },
  { name: "DDT59 - NORD", departments: ["59"], active: true, coverage_needs_review: false },
  {
    name: "DREAL Grand Est",
    departments: ["08", "10", "51", "52", "54", "55", "57", "67", "68", "88"],
    active: true,
    coverage_needs_review: false,
  },
  { name: "DEAL Réunion", departments: ["974"], active: true, coverage_needs_review: false },
  {
    name: "DREAL Auvergne-Rhône-Alpes",
    departments: ["01", "03", "07", "15", "26", "38", "42", "43", "63", "69", "73", "74"],
    active: true,
    coverage_needs_review: false,
  },
  {
    name: "DREAL BRETAGNE",
    departments: ["22", "29", "35", "56"],
    active: true,
    coverage_needs_review: false,
  },
  {
    name: "DREAL Normandie",
    departments: ["14", "27", "50", "61", "76"],
    active: true,
    coverage_needs_review: false,
  },
  { name: "DDT 45 - Loiret", departments: ["45"], active: false, coverage_needs_review: false },
  {
    name: "DREAL BFC",
    departments: ["21", "25", "39", "58", "70", "71", "89", "90"],
    active: true,
    coverage_needs_review: false,
  },
  {
    name: "DRIAT IDF",
    departments: ["75", "77", "78", "91", "92", "93", "94", "95"],
    active: true,
    coverage_needs_review: false,
  },
  { name: "DDT02", departments: ["02"], active: true, coverage_needs_review: false },
  {
    name: "DREAL de Corse et DMLC",
    departments: ["2A", "2B"],
    active: true,
    coverage_needs_review: false,
  },
  { name: "DDT37", departments: ["37"], active: false, coverage_needs_review: false },
  {
    name: "DREAL Pays de la loire",
    departments: ["44", "49", "53", "72", "85"],
    active: true,
    coverage_needs_review: false,
  },
  { name: "DGTM Guyane", departments: ["973"], active: true, coverage_needs_review: false },
  { name: "DDT 41", departments: ["41"], active: false, coverage_needs_review: false },
  {
    name: "DREAL Centre Val de Loire",
    departments: ["18", "28", "36", "37", "41", "45"],
    active: true,
    coverage_needs_review: false,
  },
];
