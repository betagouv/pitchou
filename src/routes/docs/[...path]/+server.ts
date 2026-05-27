import { resolve } from "node:path";
import type { RequestHandler } from "./$types";
import { serveStaticFile } from "$lib/server/staticFile";

const DOCS_DIR = resolve(process.cwd(), "docs");

export const GET: RequestHandler = ({ params }) => serveStaticFile(DOCS_DIR, params.path);
