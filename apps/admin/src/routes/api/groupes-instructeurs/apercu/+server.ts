import { error, json } from "@sveltejs/kit";
import {
  parsePreviewPage,
  previewGroup,
  StaleGroupPreviewError,
} from "@pitchou/server/administration.ts";
import { readJsonObject } from "#lib/server/requestValidation.ts";
import { parseGroup, saveAdministration } from "#lib/server/administration.ts";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, locals, url }) => {
  try {
    return json(
      await saveAdministration(async () => {
        const page = parsePreviewPage(url.searchParams);
        const input = parseGroup(await readJsonObject(request));
        return page
          ? previewGroup(locals.user!.id, input, page)
          : previewGroup(locals.user!.id, input);
      }),
    );
  } catch (cause) {
    if (cause instanceof StaleGroupPreviewError) error(409, cause.message);
    throw cause;
  }
};
