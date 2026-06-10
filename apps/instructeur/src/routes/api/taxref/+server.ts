import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { searchTaxref } from "$lib/server/taxref.ts";

export const GET: RequestHandler = async ({ url }) => {
  const page = Number(url.searchParams.get("page"));
  return json(
    await searchTaxref({
      text: url.searchParams.get("q") ?? "",
      regne: url.searchParams.get("regne") ?? "",
      classe: url.searchParams.get("classe") ?? "",
      sort: url.searchParams.get("tri") ?? "",
      order: url.searchParams.get("ordre") ?? "",
      page: Number.isInteger(page) && page >= 1 ? page : 1,
    }),
  );
};
