import { describe, it, expect } from "vitest";

import type { UtilisateurAARRI } from "$types/API_Pitchou.ts";
import {
  parseUtilisateursQuery,
  filterUtilisateurs,
  matchesText,
  compareUtilisateurs,
} from "./utilisateursList.ts";

// Builds a UtilisateurAARRI with sensible defaults; override only what matters.
function makeUtilisateur(overrides: Partial<UtilisateurAARRI> = {}): UtilisateurAARRI {
  return {
    personneId: 1,
    email: "instructeur@departement.gouv.fr",
    nom: "Durand",
    prenoms: "Camille",
    niveau: "acquis",
    actionCount: 0,
    lastActivityDate: null,
    ...overrides,
  };
}

function params(init: Record<string, string> = {}): URLSearchParams {
  return new URLSearchParams(init);
}

describe("parseUtilisateursQuery", () => {
  it("returns the defaults for empty params", () => {
    expect(parseUtilisateursQuery(params())).toEqual({
      searchText: "",
      niveau: "",
      sort: "niveau",
      order: "desc",
      page: 1,
    });
  });

  it("reads valid values straight from the URL", () => {
    expect(
      parseUtilisateursQuery(
        params({ q: "durand", niveau: "actif", tri: "email", ordre: "asc", page: "2" }),
      ),
    ).toEqual({
      searchText: "durand",
      niveau: "actif",
      sort: "email",
      order: "asc",
      page: 2,
    });
  });

  it("falls back to no filter for an unknown niveau", () => {
    expect(parseUtilisateursQuery(params({ niveau: "champion" })).niveau).toBe("");
  });

  it("falls back to the default sort for an unknown tri", () => {
    expect(parseUtilisateursQuery(params({ tri: "couleur" })).sort).toBe("niveau");
  });

  it("only treats ordre=asc as ascending (default is desc)", () => {
    expect(parseUtilisateursQuery(params({ ordre: "asc" })).order).toBe("asc");
    expect(parseUtilisateursQuery(params({ ordre: "desc" })).order).toBe("desc");
    expect(parseUtilisateursQuery(params()).order).toBe("desc");
  });

  it("rejects non-positive or non-integer pages, keeping page 1", () => {
    expect(parseUtilisateursQuery(params({ page: "0" })).page).toBe(1);
    expect(parseUtilisateursQuery(params({ page: "abc" })).page).toBe(1);
    expect(parseUtilisateursQuery(params({ page: "3" })).page).toBe(3);
  });
});

describe("matchesText", () => {
  const utilisateur = makeUtilisateur({
    email: "camille.durand@gironde.gouv.fr",
    nom: "Durand",
    prenoms: "Camille",
  });

  it("matches a substring of the email", () => {
    expect(matchesText(utilisateur, "gironde")).toBe(true);
  });

  it("matches a substring of the nom", () => {
    expect(matchesText(utilisateur, "dura")).toBe(true);
  });

  it("is accent- and case-insensitive", () => {
    expect(matchesText(makeUtilisateur({ nom: "Hélène" }), "HELENE")).toBe(true);
  });

  it("requires every word to match (AND), across all fields", () => {
    expect(matchesText(utilisateur, "camille gironde")).toBe(true);
    expect(matchesText(utilisateur, "camille marseille")).toBe(false);
  });

  it("tolerates null fields", () => {
    const sansNom = makeUtilisateur({ nom: null, prenoms: null, email: "x@y.fr" });
    expect(matchesText(sansNom, "x@y")).toBe(true);
    expect(matchesText(sansNom, "durand")).toBe(false);
  });
});

describe("filterUtilisateurs", () => {
  const actif = makeUtilisateur({ personneId: 1, niveau: "actif", nom: "Actif" });
  const base = makeUtilisateur({ personneId: 2, niveau: "base", nom: "Base" });
  const utilisateurs = [actif, base];
  const emptyQuery = parseUtilisateursQuery(params());

  it("returns everyone when no filter is active", () => {
    expect(filterUtilisateurs(utilisateurs, emptyQuery)).toEqual(utilisateurs);
  });

  it("filters by niveau", () => {
    expect(filterUtilisateurs(utilisateurs, { ...emptyQuery, niveau: "actif" })).toEqual([actif]);
  });

  it("combines the niveau filter with the text search", () => {
    expect(
      filterUtilisateurs(utilisateurs, { ...emptyQuery, niveau: "actif", searchText: "base" }),
    ).toEqual([]);
  });
});

describe("compareUtilisateurs", () => {
  it("orders by funnel rank, not alphabetically, on the niveau key", () => {
    const base = makeUtilisateur({ niveau: "base" });
    const impact = makeUtilisateur({ niveau: "impact" });
    expect(compareUtilisateurs(base, impact, "niveau", "asc")).toBeLessThan(0);
    expect(compareUtilisateurs(base, impact, "niveau", "desc")).toBeGreaterThan(0);
  });

  it("sorts emails alphabetically", () => {
    const a = makeUtilisateur({ email: "alice@x.fr" });
    const b = makeUtilisateur({ email: "bob@x.fr" });
    expect(compareUtilisateurs(a, b, "email", "asc")).toBeLessThan(0);
  });

  it("sorts by action count numerically", () => {
    const few = makeUtilisateur({ actionCount: 2 });
    const many = makeUtilisateur({ actionCount: 30 });
    expect(compareUtilisateurs(few, many, "actions", "asc")).toBeLessThan(0);
  });

  it("sorts by last activity, treating no activity as the oldest", () => {
    const never = makeUtilisateur({ lastActivityDate: null });
    const recent = makeUtilisateur({ lastActivityDate: "2026-05-01T00:00:00.000Z" });
    expect(compareUtilisateurs(never, recent, "activite", "asc")).toBeLessThan(0);
    expect(compareUtilisateurs(never, recent, "activite", "desc")).toBeGreaterThan(0);
  });
});
