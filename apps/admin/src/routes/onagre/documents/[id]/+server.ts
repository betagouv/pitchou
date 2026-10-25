import { error } from "@sveltejs/kit";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, url }) => {
  const id = Number(params.id);
  if (!Number.isSafeInteger(id) || id < 1) error(404, "Document introuvable.");
  const document = await db("onagre_document").where({ id }).first("filename", "mime", "original");
  if (!document?.original)
    error(404, "Cet original est conservé sur Polaris. Consultez les données dans le dump.");
  const disposition =
    document.mime === "application/pdf" && url.searchParams.has("inline") ? "inline" : "attachment";
  return new Response(new Uint8Array(document.original), {
    headers: {
      "content-type": document.mime,
      "content-disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(document.filename)}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
};
