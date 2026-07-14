export interface GeoAPICommune {
  nom: string;
  code: string;
  codeDepartement: string;
  codeRegion: string;
  codesPostaux: string[];
  siren: string;
  codeEpci: string;
  population: number;
}

export interface GeoAPIDepartement {
  nom: string;
  code: string;
}
