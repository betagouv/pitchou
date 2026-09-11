/** Names the follower when there is exactly one, counts them otherwise. */
export function followersLabel(followers: string[]): string {
  if (followers.length === 0) return "Suivi par 0 personne";
  if (followers.length === 1) return `Suivi par ${followers[0].split("@")[0]}`;
  return `Suivi par ${followers.length} personnes`;
}
