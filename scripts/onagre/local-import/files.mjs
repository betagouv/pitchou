import { execFileSync } from "node:child_process";
import { relative, resolve, isAbsolute } from "node:path";
export function assertIgnoredFile(path) {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const name = relative(root, resolve(path));
  if (name.startsWith("..") || isAbsolute(name))
    throw new Error("Keep sample data and reports inside the ignored checkout workspace.");
  if (execFileSync("git", ["ls-files", "--", name], { cwd: root, encoding: "utf8" }).trim())
    throw new Error("Migration data must not be tracked by Git.");
  try {
    execFileSync("git", ["check-ignore", "--quiet", "--", name], { cwd: root });
  } catch {
    throw new Error("Migration data and reports must be ignored by Git.");
  }
}
