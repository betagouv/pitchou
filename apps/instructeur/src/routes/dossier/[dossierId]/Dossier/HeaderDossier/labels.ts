/** Long titles step down in size so the header keeps a stable height. */
export function titleSizeClass(name: string | null | undefined): string {
  if (!name || name.length <= 50) return "text-[1.75rem]";
  return name.length <= 90 ? "text-[1.5rem]" : "text-[1.25rem]";
}

/** Names the follower when there is exactly one, counts them otherwise. */
export function followersLabel(followers: string[]): string {
  if (followers.length === 0) return "Suivi par 0 personne";
  if (followers.length === 1) return `Suivi par ${followers[0]}`;
  return `Suivi par ${followers.length} personnes`;
}
