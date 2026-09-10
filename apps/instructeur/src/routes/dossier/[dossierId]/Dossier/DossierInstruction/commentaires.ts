import type { DossierCommentaire } from "@pitchou/types/capabilities.ts";

/** Display name of a comment author: the part of the email before the @. */
export function authorName(authorEmail: DossierCommentaire["author_email"]): string {
  // The migrated free comment has no author.
  if (!authorEmail) return "initial";
  return authorEmail.split("@")[0];
}

/** Initials shown in the avatar bubble, e.g. "vanessa.rispal@…" → "VR". */
export function authorInitials(authorEmail: DossierCommentaire["author_email"]): string {
  const name = authorName(authorEmail);
  const parts = name.split(/[._-]+/).filter(Boolean);
  const letters =
    parts.length >= 2
      ? [parts[0][0], parts[1][0]]
      : [name[0] ?? "?", name[1] ?? ""].filter(Boolean);
  return letters.join("").toUpperCase();
}

const AVATAR_PALETTE = [
  "bg-[#FDDBCB] text-[#B34000]",
  "bg-[#D9E5FF] text-[#0063CB]",
  "bg-[#C3FAD5] text-[#18753C]",
  "bg-[#FEE7FC] text-[#A558A0]",
  "bg-[#FCE7C2] text-[#716043]",
];

/** Stable pastel colour per author, derived from the email. */
export function avatarClass(authorEmail: DossierCommentaire["author_email"]): string {
  const name = authorName(authorEmail);
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
