import { env } from "$env/dynamic/private";

/**
 * Parses a BODY_SIZE_LIMIT value ("200M", "512K", "1G", "1048576", "Infinity")
 * into a number of bytes, mirroring adapter-node's own parsing.
 */
export function parseBodySizeLimit(value: string): number {
  const multiplier =
    ({ K: 1024, M: 1024 * 1024, G: 1024 * 1024 * 1024 } as Record<string, number>)[
      value[value.length - 1]?.toUpperCase()
    ] ?? 1;
  return Number(multiplier !== 1 ? value.slice(0, -1) : value) * multiplier;
}

/**
 * Upload size limit enforced by adapter-node, read from the same BODY_SIZE_LIMIT
 * env var. Single source of truth for both the actual limit and the size hints
 * shown in the UI. Defaults to the value set in scripts/start.sh when unset
 * (e.g. local dev, where adapter-node isn't used).
 */
export function getMaxUploadSizeBytes(): number {
  return parseBodySizeLimit(env.BODY_SIZE_LIMIT ?? "200M");
}
