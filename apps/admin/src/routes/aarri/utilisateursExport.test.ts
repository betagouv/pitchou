import { describe, expect, it } from "vitest";
import type { UtilisateurAARRI } from "@pitchou/types/API_Pitchou.ts";
import { countByNiveau, utilisateursToCSV } from "./utilisateursList.ts";

function makeUtilisateur(overrides: Partial<UtilisateurAARRI> = {}): UtilisateurAARRI {
  return {
    personneId: 1,
    email: "instructeur@departement.gouv.fr",
    lastName: "Durand",
    firstNames: "Camille",
    niveau: "acquis",
    groupesInstructeurs: [],
    actionCount: 0,
    lastActivityDate: null,
    ...overrides,
  };
}

describe("utilisateursToCSV", () => {
  it("writes a header and one line per utilisateurice", () => {
    const csv = utilisateursToCSV([
      makeUtilisateur({
        email: "camille@dept.gouv.fr",
        niveau: "actif",
        groupesInstructeurs: ["Alpha", "Beta"],
        actionCount: 7,
        lastActivityDate: "2026-05-01T09:30:00.000Z",
      }),
    ]);
    const [header, line] = csv.split("\n");
    expect(header).toBe(
      "Email,Groupes instructeurs,Niveau AARRI,Nombre d'actions,Dernière activité",
    );
    expect(line).toBe("camille@dept.gouv.fr,Alpha ; Beta,Activé,7,2026-05-01");
  });
  it("leaves email and date empty when absent", () => {
    const csv = utilisateursToCSV([
      makeUtilisateur({ email: null, groupesInstructeurs: [], lastActivityDate: null }),
    ]);
    expect(csv.split("\n")[1]).toBe(",,Acquis,0,");
  });
  it("quotes fields that contain a comma", () => {
    expect(
      utilisateursToCSV([makeUtilisateur({ groupesInstructeurs: ["Nord, Sud"], email: "x@y.fr" })]),
    ).toContain('"Nord, Sud"');
  });
});

describe("countByNiveau", () => {
  it("counts utilisateurs per level, with zero for absent levels", () => {
    const counts = countByNiveau([
      makeUtilisateur({ niveau: "base" }),
      makeUtilisateur({ niveau: "base" }),
      makeUtilisateur({ niveau: "actif" }),
    ]);
    expect(counts).toEqual({ base: 2, acquis: 0, actif: 1, retenu: 0, impact: 0 });
  });
  it("returns all zeros for an empty list", () => {
    expect(countByNiveau([])).toEqual({ base: 0, acquis: 0, actif: 0, retenu: 0, impact: 0 });
  });
});
