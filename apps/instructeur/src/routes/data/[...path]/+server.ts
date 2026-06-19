import { resolve } from "node:path";
import type { RequestHandler } from "./$types";
import { serveStaticFile } from "$lib/server/staticFile";
import { REPO_ROOT } from "$lib/server/repoRoot";

// /data lives at the repo root (large folder, kept out of the bundle, shared with the worker
// and scripts).
const DATA_DIR = resolve(REPO_ROOT, "data");

export const GET: RequestHandler = ({ params }) => serveStaticFile(DATA_DIR, params.path);
