import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { searchBdcStatut } from "$lib/server/bdcStatut.ts";

export const GET: RequestHandler = async ({ url }) => {
  const page = Number(url.searchParams.get("page"));
  return json(
    await searchBdcStatut({
      text: url.searchParams.get("q") ?? "",
      statut: url.searchParams.get("statut") ?? "",
      sort: url.searchParams.get("tri") ?? "",
      order: url.searchParams.get("ordre") ?? "",
      page: Number.isInteger(page) && page >= 1 ? page : 1,
    }),
  );
};
