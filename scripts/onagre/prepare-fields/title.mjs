export function prepareTitle(demande, projet, relatedDemandes) {
  if (!Array.isArray(relatedDemandes)) throw new Error("Expected complete sibling demande list");
  const ids = [...new Set([demande.demandesid, ...relatedDemandes.map((row) => row.id)])];
  if (ids.some((id) => typeof id !== "string" || !/^[1-9]\d*$/u.test(id)))
    throw new Error("Invalid sibling demande ID");
  ids.sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0));
  const name = projet.nomprojet;
  return {
    name:
      ids.length > 1 && name?.trim()
        ? `${ids.indexOf(demande.demandesid) + 1} - ${name}`
        : (name ?? null),
    evidence: [
      `projet:${projet.projetid}.nomprojet`,
      ...ids.map((id) => `demandes:${id}.projetid`),
    ],
  };
}
