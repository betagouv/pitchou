import { describe, expect, test } from "vitest";

import { nextActionGroups, nextActionValue, parseNextActionValue } from "./nextAction.ts";

describe("nextActionValue / parseNextActionValue", () => {
  test("round-trips an entity and its action", () => {
    const value = nextActionValue("Instructeur", "Envoyer la saisine");
    expect(parseNextActionValue(value)).toEqual({
      entity: "Instructeur",
      action: "Envoyer la saisine",
    });
  });

  test("round-trips an entity without a precise action", () => {
    const value = nextActionValue("CNPN/CSRPN", null);
    expect(parseNextActionValue(value)).toEqual({ entity: "CNPN/CSRPN", action: null });
  });

  test("the empty value means « non renseignée »", () => {
    expect(nextActionValue(null, null)).toBe("");
    expect(parseNextActionValue("")).toEqual({ entity: null, action: null });
  });

  test("an unknown entity is dropped rather than trusted", () => {
    expect(parseNextActionValue("Martien|Envoyer la saisine").entity).toBeNull();
  });
});

describe("nextActionGroups", () => {
  test("every entity is a group ending with « Autre »", () => {
    for (const group of nextActionGroups) {
      expect(group.options.at(-1)).toEqual({
        value: nextActionValue(group.entity, null),
        label: "Autre",
      });
    }
  });

  test("the actions of an entity come before its « Autre »", () => {
    const instructeur = nextActionGroups.find(({ entity }) => entity === "Instructeur");
    expect(instructeur?.options.map(({ label }) => label)).toEqual([
      "Envoyer la saisine",
      "Consulter le dossier",
      "Autre",
    ]);
  });

  test("an entity without a suggested action only offers « Autre »", () => {
    const consultation = nextActionGroups.find(({ entity }) => entity === "Consultation du public");
    expect(consultation?.options.map(({ label }) => label)).toEqual(["Autre"]);
  });
});
