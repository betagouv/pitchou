import { error, json } from "@sveltejs/kit";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { loadCommentDemandes } from "@pitchou/server/onagre/comments/demandes.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, url }) => {
  if (!/^[a-f0-9]{16}$/u.test(params.groupId)) error(400, "Groupe invalide.");
  const origin = process.env.PUBLIC_SITE_URL_PITCHOU;
  if (!origin) error(503, "L’adresse de l’application instructeur n’est pas configurée.");
  const result = await loadCommentDemandes(
    db,
    params.groupId,
    Number(url.searchParams.get("page") ?? 1),
    origin,
  );
  if (!result) error(404, "Formulation introuvable.");
  return json(result, { headers: { "cache-control": "no-store" } });
};
