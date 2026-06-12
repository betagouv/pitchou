import { resolve } from "node:path";
import { dev } from "$app/environment";
import type { RequestHandler } from "./$types";
import { serveStaticFile } from "$lib/server/staticFile";

// /docs lives at the repo root (Jekyll site). In prod the app runs from the repo root
// (cwd = root); in dev, vite runs with cwd = apps/instructeur, so we go up two levels.
const REPO_ROOT = dev ? resolve(process.cwd(), "..", "..") : process.cwd();
const DOCS_DIR = resolve(REPO_ROOT, "docs");

export const GET: RequestHandler = ({ params }) => serveStaticFile(DOCS_DIR, params.path);
