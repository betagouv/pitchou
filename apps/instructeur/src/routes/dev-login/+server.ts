import { error, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getPersonneByEmail } from "@pitchou/server/database/personne.ts";

export const GET: RequestHandler = async () => {
  if (process.env.PUBLIC_PITCHOU_ENV !== "staging") {
    error(404);
  }

  const email = process.env.SEED_EMAIL || "dev@localhost.local";
  const personne = await getPersonneByEmail(email);

  if (!personne?.code_accès) {
    error(404, "Utilisateur dev introuvable — lancer les seeds");
  }

  redirect(302, `/?secret=${personne.code_accès}`);
};
