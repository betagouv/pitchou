// CNPN delivery policy: the complete encoded message must stay below 10 decimal MB.
export const MAX_EMAIL_BYTES = 10_000_000;
export const FRANCE_TRANSFERT_URL = "https://francetransfert.numerique.gouv.fr/upload";
export const EMAIL_SIZE_ERROR =
  "Le mail dépasse la limite de 10 Mo après encodage. Déposez les fichiers volumineux sur France Transfert, ajoutez le lien de téléchargement dans le corps du mail, puis retirez ces fichiers des pièces jointes.";

export function base64MimeBytes(bytes: number): number {
  const encodedBytes = 4 * Math.ceil(bytes / 3);
  return encodedBytes + 2 * Math.ceil(encodedBytes / 76);
}
