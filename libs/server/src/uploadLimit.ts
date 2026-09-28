/**
 * Parses a size ("200M", "512K", "1G", "1048576", "Infinity") into bytes,
 * with the same notation adapter-node uses for BODY_SIZE_LIMIT.
 */
export function parseSizeLimit(value: string): number {
  const multiplier =
    ({ K: 1024, M: 1024 * 1024, G: 1024 * 1024 * 1024 } as Record<string, number>)[
      value[value.length - 1]?.toUpperCase()
    ] ?? 1;
  return Number(multiplier !== 1 ? value.slice(0, -1) : value) * multiplier;
}

/**
 * Largest file the browser may send to object storage. Files no longer go
 * through the app server, so this is a product choice rather than a platform
 * ceiling. Single source of truth for the signed URL, the registration check
 * and the size hint shown in the UI. Overridable via MAX_UPLOAD_SIZE.
 */
export function getMaxUploadSizeBytes(): number {
  // `||` rather than `??`: an empty value in the environment means "use the default".
  return parseSizeLimit(process.env.MAX_UPLOAD_SIZE || "1G");
}
