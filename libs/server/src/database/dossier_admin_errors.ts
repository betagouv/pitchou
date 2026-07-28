/** Thrown when the target dossier does not exist. */
export class DossierNotFoundError extends Error {
  constructor(dossierId: number) {
    super(`Dossier ${dossierId} not found`);
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
