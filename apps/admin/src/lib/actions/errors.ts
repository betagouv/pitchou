/**
 * Thrown when the session does not belong to an admin (403).
 */
export class AccessDeniedError extends Error {
  constructor(message = "Accès réservé aux administrateurs.") {
    super(message);
    this.name = "AccessDenied";
  }
}
