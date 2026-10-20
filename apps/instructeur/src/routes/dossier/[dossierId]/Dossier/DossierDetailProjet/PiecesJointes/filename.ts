export function truncateFilename(name: string | null, max = 43): string {
  if (!name) return "(fichier sans nom)";
  if (name.length <= max) return name;
  const marker = "(…)";
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 ? name.slice(dot) : "";
  // Leave room for part of the name; unusually long extensions are truncated too.
  if (extension.length >= max - marker.length) {
    return name.slice(0, max - marker.length) + marker;
  }
  return name.slice(0, max - marker.length - extension.length) + marker + extension;
}
