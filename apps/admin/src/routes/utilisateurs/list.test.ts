import { describe, expect, it } from "vitest";
import { compareUsers, filterUsers, groupFilterOptions, parseQuery, visiblePages } from "./list.ts";
import type { User } from "./model.ts";

function user(id: number, overrides: Partial<User> = {}): User {
  return {
    id,
    email: `user${id}@example.org`,
    first_names: null,
    last_name: null,
    last_login_at: null,
    groupes: [],
    bundles: [],
    ...overrides,
  } as User;
}

describe("user list sorting", () => {
  it("keeps accounts without a login date last in both directions", () => {
    const users = [
      user(1),
      user(2, { last_login_at: new Date("2026-01-01") }),
      user(3, { last_login_at: new Date("2026-09-01") }),
    ];
    expect(
      users.toSorted((a, b) => compareUsers(a, b, "last_login", "desc")).map((user) => user.id),
    ).toEqual([3, 2, 1]);
    expect(
      users.toSorted((a, b) => compareUsers(a, b, "last_login", "asc")).map((user) => user.id),
    ).toEqual([2, 3, 1]);
  });
  it("sorts French names without treating accents as a separate alphabet", () => {
    const users = [
      user(1, { first_names: "Zoé" }),
      user(2, { first_names: "Élodie" }),
      user(3, { first_names: "Alice" }),
    ];
    expect(
      users.toSorted((a, b) => compareUsers(a, b, "name", "asc")).map((user) => user.id),
    ).toEqual([3, 2, 1]);
  });
  it("counts only active groups and breaks equal counts consistently", () => {
    const users = [
      user(3, { groupes: [{ id: "a", name: "Archivé", active: false }] }),
      user(2),
      user(1, { groupes: [{ id: "b", name: "Actif", active: true }] }),
    ];
    expect(
      users.toSorted((a, b) => compareUsers(a, b, "groups", "desc")).map((user) => user.id),
    ).toEqual([1, 2, 3]);
  });
});

it("falls back to valid view settings for malformed URLs", () => {
  expect(
    parseQuery(
      new URLSearchParams(
        "q=élodie&groupe=inconnu&profil=inconnu&tri=inconnu&ordre=inconnu&actifs=-2&desactives=1.5",
      ),
      [],
    ),
  ).toEqual({
    search: "élodie",
    profile: "",
    groupe: "",
    sort: "email",
    order: "asc",
    activePage: 1,
    inactivePage: 1,
  });
  expect(
    parseQuery(
      new URLSearchParams("profil=instructeur&tri=groups&ordre=desc&actifs=4&desactives=2"),
      [],
    ),
  ).toMatchObject({
    profile: "instructeur",
    sort: "groups",
    order: "desc",
    activePage: 4,
    inactivePage: 2,
  });
});

it("combines group, profile and text filters using active memberships", () => {
  const activeGroup = { id: "g1", name: "DDT 2", active: true };
  const archivedGroup = { id: "g2", name: "Archivé", active: false };
  const users = [
    user(1, { groupes: [activeGroup], bundles: ["instructeur"] }),
    user(2, { groupes: [activeGroup] }),
    user(3, { groupes: [archivedGroup], grants: ["dossier:read"] }),
    user(4, { bundles: ["administrateur"] }),
    user(5),
  ];
  const options = groupFilterOptions(users.flatMap((user) => user.groupes));
  expect(options).toEqual([{ value: "g1", label: "DDT 2" }]);

  const matchingIds = (query: string) =>
    filterUsers(users, parseQuery(new URLSearchParams(query), options)).map((user) => user.id);
  expect(matchingIds("groupe=g1")).toEqual([1, 2]);
  expect(matchingIds("groupe=g1&profil=instructeur")).toEqual([1]);
  expect(matchingIds("groupe=g1&profil=aucun")).toEqual([2]);
  expect(matchingIds("groupe=aucun&profil=aucun")).toEqual([3, 5]);
  expect(matchingIds("groupe=aucun&profil=aucun&q=archive")).toEqual([3]);
});

it("keeps page links bounded while exposing the first, last and neighboring pages", () => {
  expect(visiblePages(1, 2)).toEqual([1, 2]);
  expect(visiblePages(6, 12)).toEqual([1, 5, 6, 7, 12]);
  expect(visiblePages(12, 12)).toEqual([1, 11, 12]);
});
