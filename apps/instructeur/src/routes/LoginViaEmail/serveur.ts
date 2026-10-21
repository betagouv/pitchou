import { json } from "#lib/shared/http.ts";

export function envoiEmailConnexion(email: string) {
  return json(`/envoi-email-connexion?email=${encodeURIComponent(email)}`, {
    method: "POST",
  });
}
