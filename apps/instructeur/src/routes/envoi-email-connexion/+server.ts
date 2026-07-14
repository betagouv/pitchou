import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { authorizedEmailDomains } from "@pitchou/common/constantes.ts";
import { createPersonneOrUpdateCodeAcces } from "@pitchou/server/database/personne.ts";
import { envoyerEmailConnexion } from "@pitchou/server/emails.ts";

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

  const codeAcces = await createPersonneOrUpdateCodeAcces(email);
  const lienConnexion = `${process.env.PUBLIC_SITE_URL_PITCHOU}/?secret=${codeAcces}`;
  await envoyerEmailConnexion(email, lienConnexion);

  return new Response(null, { status: 204 });
};
