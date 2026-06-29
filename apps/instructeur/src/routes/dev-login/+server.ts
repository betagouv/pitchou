import { error, redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getPersonneByEmail } from "@pitchou/server/database/personne.ts";

// Connexion en un clic « en tant que dev », réservée à staging.
// Garde-fou côté serveur (indépendant de l'affichage de la bannière) : sur prod
// PUBLIC_PITCHOU_ENV est vide, donc cette route renvoie 404 et ne peut jamais servir.
export const GET: RequestHandler = async () => {
  if (process.env.PUBLIC_PITCHOU_ENV !== "staging") {
    error(404);
  }

  const email = process.env.SEED_EMAIL || "dev@localhost.local";
  const personne = await getPersonneByEmail(email);

  if (!personne?.code_accès) {
    error(404, "Utilisateur dev introuvable — lancer les seeds");
  }

  // Réutilise le flux du lien magique : la home consomme `?secret=` (consumeSecretFromURL).
  redirect(302, `/?secret=${personne.code_accès}`);
};
