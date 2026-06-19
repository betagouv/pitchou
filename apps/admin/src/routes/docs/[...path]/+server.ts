import { resolve } from "node:path";
import type { RequestHandler } from "./$types";
import { serveStaticFile, REPO_ROOT } from "@pitchou/server-utils";

// /docs lives at the repo root (Jekyll site), shared with the instructeur app.
const DOCS_DIR = resolve(REPO_ROOT, "docs");

export const GET: RequestHandler = ({ params }) => serveStaticFile(DOCS_DIR, params.path);
