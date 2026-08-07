export function projectMapError(caught: unknown): string {
  return caught instanceof Error ? caught.message : String(caught);
}
