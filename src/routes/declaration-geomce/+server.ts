import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireSecret } from "$lib/server/auth";
import { verifierSecretGeoMCE } from "$server/database/capability-geomce.ts";
import { générerDéclarationGeoMCE } from "$server/database/geomce.ts";
import type { CapabilityGeomceSecret } from "$types/database/public/CapabilityGeomce.ts";

export const GET: RequestHandler = async ({ url }) => {
  const secret = requireSecret(url) as CapabilityGeomceSecret;

  try {
    await verifierSecretGeoMCE(secret);
  } catch {
    error(
      403,
      `Le paramètre 'secret' est invalide. Contacter l'équipe Pitchou pour comprendre de quoi il retourne`,
    );
  }

  return json(await générerDéclarationGeoMCE());
};
