import type { Position } from "./projectMapGeometry.ts";

export async function findAddressCoordinates(address: string): Promise<Position> {
  const response = await fetch(
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`,
  );
  const result = (await response.json()) as {
    features?: { geometry?: { coordinates?: Position } }[];
  };
  const coordinates = result.features?.[0]?.geometry?.coordinates;
  if (!coordinates) throw new Error("Adresse introuvable.");
  return coordinates;
}
