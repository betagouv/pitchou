import { resolve } from "node:path";
import { dev } from "$app/environment";
import type { RequestHandler } from "./$types";
import { serveStaticFile } from "$lib/server/staticFile";

// /data lives at the repo root (large folder, kept out of the bundle, shared with the worker
// and scripts). In prod the app runs from the repo root (cwd = root); in dev, vite runs with
// cwd = apps/instructeur, so we go up two levels to reach the root.
const REPO_ROOT = dev ? resolve(process.cwd(), "..", "..") : process.cwd();
const DATA_DIR = resolve(REPO_ROOT, "data");

export const GET: RequestHandler = ({ params }) => serveStaticFile(DATA_DIR, params.path);
