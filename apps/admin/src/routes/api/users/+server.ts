import { readJsonObject } from "$lib/server/requestValidation.ts";
import { json } from "@sveltejs/kit";
import { listUsers, saveUser } from "@pitchou/server/administration.ts";
import { parseUser, saveAdministration } from "$lib/server/administration.ts";
import type { RequestHandler } from "./$types";
export const GET: RequestHandler = async () => json(await listUsers());
export const POST: RequestHandler = async ({ request, locals }) =>
  json(
    await saveAdministration(async () =>
      saveUser(locals.user!.id, parseUser(await readJsonObject(request))),
    ),
  );
