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

export interface GeoAPIDépartement {
    nom: string;
    code: string;
}