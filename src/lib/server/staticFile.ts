import { error } from "@sveltejs/kit";
import { stat, readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".ods": "application/vnd.oasis.opendocument.spreadsheet",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".yml": "application/yaml; charset=utf-8",
};

export async function serveStaticFile(baseDir: string, relativePath: string): Promise<Response> {
  const safeBase = resolve(baseDir) + sep;
  const target = resolve(baseDir, relativePath);
  if (!target.startsWith(safeBase)) {
    error(403, "Chemin invalide");
  }

  try {
    const info = await stat(target);
    if (!info.isFile()) {
      error(404, "Fichier non trouvé");
    }
  } catch {
    error(404, "Fichier non trouvé");
  }

  const contenu = await readFile(target);
  const contentType = MIME_TYPES[extname(target).toLowerCase()] ?? "application/octet-stream";
  return new Response(contenu, { headers: { "content-type": contentType } });
}
