import { json } from "d3-fetch";

export function envoiEmailConnexion(email: string) {
  return json(`/envoi-email-connexion?email=${encodeURIComponent(email)}`, {
    method: "POST",
  });
}
