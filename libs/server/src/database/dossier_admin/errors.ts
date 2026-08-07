export class DossierNotFoundError extends Error {
  constructor(dossierId: number) {
    super(`Dossier ${dossierId} introuvable`);
    this.name = "DossierNotFoundError";
  }
}
export class DossierManagedByDnError extends Error {
  fields: string[];
  constructor(dossierId: number, fields: string[] = []) {
    const detail = fields.length ? ` (fields: ${fields.join(", ")})` : "";
    super(`Dossier ${dossierId} is synchronized from Demarche Numerique${detail}`);
    this.name = "DossierManagedByDnError";
    this.fields = fields;
  }
}
export class DossierUnknownSourceError extends Error {
  constructor(dossierId: number) {
    super(`Dossier ${dossierId} has an unknown source and is read-only`);
    this.name = "DossierUnknownSourceError";
  }
}
export class DossierNotCreatedInPitchouError extends Error {
  constructor(dossierId: number) {
    super(`Dossier ${dossierId} was not created in Pitchou`);
    this.name = "DossierNotCreatedInPitchouError";
  }
}
