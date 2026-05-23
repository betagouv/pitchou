import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { authorizedEmailDomains } from "$commun/constantes.js";
import { créerPersonneOuMettreÀJourCodeAccès } from "$server/database/personne.js";
import { envoyerEmailConnexion } from "$server/emails.js";

export const POST: RequestHandler = async ({ url }) => {
  const rawEmail = url.searchParams.get("email");
  if (!rawEmail) {
    error(400, "Paramètre 'email' manquant dans l'URL");
  }
  const email = decodeURIComponent(rawEmail);
  const [, domain] = email.split("@");

  if (!authorizedEmailDomains.has(domain)) {
    error(403, `Le domaine '${domain}' ne fait pas partie des domaines autorisés`);
  }

  const codeAcces = await créerPersonneOuMettreÀJourCodeAccès(email);
  const lienConnexion = `${process.env.SITE_URL_PITCHOU}/?secret=${codeAcces}`;
  await envoyerEmailConnexion(email, lienConnexion);

  return new Response(null, { status: 204 });
};
