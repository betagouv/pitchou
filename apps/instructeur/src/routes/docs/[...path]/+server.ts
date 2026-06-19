import { resolve } from "node:path";
import type { RequestHandler } from "./$types";
import { serveStaticFile } from "$lib/server/staticFile";
import { REPO_ROOT } from "$lib/server/repoRoot";

// /docs lives at the repo root (Jekyll site).
const DOCS_DIR = resolve(REPO_ROOT, "docs");

export const GET: RequestHandler = ({ params }) => serveStaticFile(DOCS_DIR, params.path);
