/** Thrown when the target dossier does not exist. */
export class DossierNotFoundError extends Error {
  constructor(dossierId: number) {
    super(`Dossier ${dossierId} introuvable`);
    this.name = "DossierNotFoundError";
  }
}

/**
 * Thrown when an operation reserved for Pitchou-native dossiers is attempted
 * on a dossier synchronized from Demarche Numerique.
 */
export class DossierManagedByDnError extends Error {
  fields: string[];

  constructor(dossierId: number, fields: string[] = []) {
    const detail = fields.length >= 1 ? ` (fields: ${fields.join(", ")})` : "";
    super(`Dossier ${dossierId} is synchronized from Demarche Numerique${detail}`);
    this.name = "DossierManagedByDnError";
    this.fields = fields;
  }
}

/** Thrown when an operation is unsafe because the dossier provenance is unknown. */
export class DossierUnknownSourceError extends Error {
  constructor(dossierId: number) {
    super(`Dossier ${dossierId} has an unknown source and is read-only`);
    this.name = "DossierUnknownSourceError";
  }
}

/** Thrown when an operation is reserved for dossiers explicitly created in Pitchou. */
export class DossierNotCreatedInPitchouError extends Error {
  constructor(dossierId: number) {
    super(`Dossier ${dossierId} was not created in Pitchou`);
    this.name = "DossierNotCreatedInPitchouError";
  }
}
