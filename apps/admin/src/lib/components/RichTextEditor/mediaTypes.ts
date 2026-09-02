// Keep in sync with CHANGELOG_MEDIA_TYPES in @pitchou/server/changelogMedia.ts
// (not imported: that module pulls the S3 client into a browser bundle).
export const CHANGELOG_MEDIA_ACCEPT = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
].join(",");
