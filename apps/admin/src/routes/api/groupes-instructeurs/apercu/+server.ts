import { json } from "@sveltejs/kit";
import { previewGroup } from "@pitchou/server/administration.ts";
import { readJsonObject } from "#lib/server/requestValidation.ts";
import { parseGroup, saveAdministration } from "#lib/server/administration.ts";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals }) =>
  json(
    await saveAdministration(async () =>
      previewGroup(locals.user!.id, parseGroup(await readJsonObject(request))),
    ),
  );
