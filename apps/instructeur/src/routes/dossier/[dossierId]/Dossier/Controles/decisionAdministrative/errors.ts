import { RequestError } from "#lib/shared/createCapObjectFromURLs/requestWrappers.ts";

export class PrescriptionImportError extends Error {}

export type SurfaceConversion = {
  prescription: number;
  column: string;
  original: string;
  squareMetres: number;
};

export class SurfaceConversionRequired extends PrescriptionImportError {
  constructor(readonly conversions: SurfaceConversion[]) {
    super("Les surfaces doivent être enregistrées en m². Vérifiez les conversions proposées.");
  }
}

export function importErrorMessage(cause: unknown): string {
  if (cause instanceof PrescriptionImportError) return cause.message;
  if (cause instanceof RequestError && [401, 403].includes(cause.status)) {
    return "Vous n'avez plus accès à l'import. Rechargez la page et vérifiez votre connexion à Pitchou.";
  }
  if (cause instanceof RequestError && cause.status === 400) {
    return "Le fichier n'a pas pu être enregistré. Vérifiez les valeurs saisies dans le modèle. Si le problème persiste, contactez l'équipe Pitchou.";
  }
  return "L'enregistrement n'a pas pu être confirmé. Vérifiez votre connexion et rechargez le dossier avant de réessayer, pour éviter un doublon. Si le problème persiste, contactez l'équipe Pitchou.";
}
