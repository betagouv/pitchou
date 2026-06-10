import { resolve } from "node:path";
import type { RequestHandler } from "./$types";
import { serveStaticFile } from "$lib/server/staticFile";

// /data is read from <cwd>/data at runtime; the directory is large and lives outside the bundle.
const DATA_DIR = resolve(process.cwd(), "data");

export const GET: RequestHandler = ({ params }) => serveStaticFile(DATA_DIR, params.path);
