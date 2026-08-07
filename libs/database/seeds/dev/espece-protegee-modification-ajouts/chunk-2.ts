import type { EspeceProtegeeModificationInitializer } from "@pitchou/types/database/public/EspeceProtegeeModification.ts";

export const AJOUTS_CHUNK_2: EspeceProtegeeModificationInitializer[] = [
  {
    cd_ref: "186209",
    classification: "faune non-oiseau",
    noms_scientifiques: ["Bovidae"],
    noms_vernaculaires: ["Bisons", "Boeufs"],
    cd_type_statuts: ["Espèce manquante"],
  },
  {
    cd_ref: "186233",
    classification: "faune non-oiseau",
    noms_scientifiques: ["Chiroptera", "Microchiroptera"],
    noms_vernaculaires: [],
    cd_type_statuts: ["Espèce manquante"],
  },
  {
    cd_ref: "186259",
    classification: "faune non-oiseau",
    noms_scientifiques: ["Muridae"],
    noms_vernaculaires: ["Souris", "Campagnols", "Mulots", "Rats"],
    cd_type_statuts: ["Espèce manquante"],
  },
  {
    cd_ref: "189374",
    classification: "oiseau",
    noms_scientifiques: ["Ara"],
    noms_vernaculaires: [],
    cd_type_statuts: ["Espèce manquante"],
  },
  {
    cd_ref: "192256",
    classification: "faune non-oiseau",
    noms_scientifiques: ["Eptesicus"],
    noms_vernaculaires: [],
    cd_type_statuts: ["Espèce manquante"],
  },
  {
    cd_ref: "194935",
    classification: "faune non-oiseau",
    noms_scientifiques: ["Mus"],
    noms_vernaculaires: [],
    cd_type_statuts: ["Espèce manquante"],
  },
  {
    cd_ref: "195005",
    classification: "faune non-oiseau",
    noms_scientifiques: ["Myotis"],
    noms_vernaculaires: [],
    cd_type_statuts: ["Espèce manquante"],
  },
  {
    cd_ref: "195598",
    classification: "oiseau",
    noms_scientifiques: ["Otus"],
    noms_vernaculaires: [],
    cd_type_statuts: ["Espèce manquante"],
  },
  {
    // Also a CNPN species: an addition can itself carry ministérielle/CNPN flags
    // (the importer matches additions against the .ods lists too).
    cd_ref: "886117",
    classification: "oiseau",
    noms_scientifiques: [
      "Calonectris borealis",
      "Calonectris diomedea borealis",
      "Puffinus borealis",
    ],
    noms_vernaculaires: ["Puffin cendré"],
    cd_type_statuts: ["Espèce manquante"],
    espece_cnpn: true,
  },
] as unknown as EspeceProtegeeModificationInitializer[];
