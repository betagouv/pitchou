import { error } from "@sveltejs/kit";
import { requireUserId } from "#lib/server/auth.ts";
import type { RequestHandler } from "./$types";

const personalFollowingOnly: RequestHandler = ({ locals }) => {
  requireUserId(locals);
  error(403, "Le suivi est personnel. Chaque personne choisit les dossiers qu'elle suit.");
};

export const GET = personalFollowingOnly;
export const POST = personalFollowingOnly;
