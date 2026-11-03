import { expect, test } from "vitest";
import { groupDossiersByProjet } from "./projects.ts";
import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";

test("groups matching demandes without mutating the source or hiding a matching sibling", () => {
  const demandes = [1, 2, 3].map((id) => ({
    id,
    name: `Demande ${id}`,
    projet:
      id < 3
        ? {
            id: "project",
            name: "Projet commun",
            demandeLabel: `Demande ${id}`,
            count: 2,
          }
        : undefined,
  })) as DossierSummary[];
  const grouped = groupDossiersByProjet(demandes);
  expect(grouped.map(({ id }) => id)).toEqual([1, 3]);
  expect(grouped[0].projet?.matchingCount).toBe(2);
  expect(demandes[0].name).toBe("Demande 1");
  expect(demandes[0].projet?.matchingCount).toBeUndefined();
  expect(groupDossiersByProjet(demandes.slice(1))[0]).toMatchObject({
    id: 2,
    name: "Projet commun",
    projet: { matchingCount: 1 },
  });
});
