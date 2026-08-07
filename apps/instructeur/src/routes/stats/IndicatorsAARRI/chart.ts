export const AARRI_SERIES = [
  {
    key: "nombreUtilisateuriceAcquis",
    label: "Acquis",
    color: "var(--artwork-minor-brown-caramel)",
  },
  { key: "nombreUtilisateuriceActif", label: "Activé", color: "var(--artwork-minor-green-menthe)" },
  {
    key: "nombreUtilisateuriceRetenu",
    label: "Retenu",
    color: "var(--artwork-minor-yellow-moutarde)",
  },
  {
    key: "nombreUtilisateuriceImpact",
    label: "Impact",
    color: "var(--artwork-minor-red-marianne)",
  },
] as const;

export function niceChartStep(max: number, targetTicks: number): number {
  const rough = max / targetTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const normalized = rough / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return Math.max(1, step * magnitude);
}
