import { beforeEach, expect, test, vi } from "vitest";
import getAllDeletedDossiers from "./getAllDeletedDossiers.ts";
import queryGraphQL from "./queryGraphQL.ts";
import { deletedDossiersQuery, pendingDeletedDossiersQuery } from "./graphQLqueries.ts";

vi.mock("./queryGraphQL.ts", () => ({ default: vi.fn() }));
beforeEach(() => {
  vi.mocked(queryGraphQL).mockReset();
});

const queries = {
  deletedDossiers: deletedDossiersQuery,
  pendingDeletedDossiers: pendingDeletedDossiersQuery,
};
type Field = keyof typeof queries;
const fields = Object.keys(queries) as Field[];
const dossier = (number: number) => ({
  number,
  dateSupression: "2026-01-01T12:00:00Z",
  state: "en_construction",
  reason: "user_request",
});
const page = (
  field: Field,
  nodes: ReturnType<typeof dossier>[],
  endCursor: string | null = null,
) => ({
  demarche: { [field]: { nodes, pageInfo: { hasNextPage: endCursor !== null, endCursor } } },
});
const fieldOf = (query: string) => {
  const field = fields.find((field) => queries[field] === query);
  if (!field) throw new Error("Unexpected query");
  return field;
};

test("collects every page of both deletion lists with independent cursors", async () => {
  const deleted = Array.from({ length: 201 }, (_, i) => dossier(i + 1));
  const pending = Array.from({ length: 102 }, (_, i) => dossier(i + 1001));
  vi.mocked(queryGraphQL).mockImplementation(async (token, query, variables) => {
    expect(token).toBe("test-token");
    expect(variables.demarcheNumber).toBe(88444);
    expect(variables.deletedFirst).toBe(100);
    expect(variables).not.toHaveProperty("last");
    const field = fieldOf(query);
    const rows = field === "deletedDossiers" ? deleted : pending;
    const cursors = [undefined, `${field}-100`, `${field}-200`];
    const index = cursors.indexOf(variables.deletedAfter);
    expect(index).toBeGreaterThanOrEqual(0);
    const offset = index * 100;
    return page(
      field,
      rows.slice(offset, offset + 100),
      offset + 100 < rows.length ? `${field}-${offset + 100}` : null,
    );
  });
  expect(await getAllDeletedDossiers("test-token", 88444)).toEqual([...deleted, ...pending]);
  expect(queryGraphQL).toHaveBeenCalledTimes(5);
});

test("empty lists stop after the first page", async () => {
  vi.mocked(queryGraphQL).mockImplementation(async (_token, query) => page(fieldOf(query), []));
  expect(await getAllDeletedDossiers("test-token", 88444)).toEqual([]);
  expect(queryGraphQL).toHaveBeenCalledTimes(2);
});

test.each(fields)(
  "a later %s page failure rejects instead of returning a partial deletion list",
  async (failingField) => {
    vi.mocked(queryGraphQL).mockImplementation(async (_token, query, variables) => {
      const field = fieldOf(query);
      if (field !== failingField) return page(field, []);
      if (variables.deletedAfter) throw new Error("DN unavailable");
      return page(field, [dossier(1)], "next-page");
    });
    await expect(getAllDeletedDossiers("test-token", 88444)).rejects.toThrow("DN unavailable");
  },
);

test.each([null, "repeated-cursor"])(
  "rejects invalid pagination with cursor %s instead of looping",
  async (endCursor) => {
    vi.mocked(queryGraphQL).mockImplementation(async (_token, query) => {
      const field = fieldOf(query);
      const result = page(field, field === "deletedDossiers" ? [dossier(1)] : [], endCursor);
      result.demarche[field].pageInfo.hasNextPage = field === "deletedDossiers";
      // Bound the mock as well, so a regression cannot hang the test runner.
      if (vi.mocked(queryGraphQL).mock.calls.length > 5) throw new Error("Too many requests");
      return result;
    });
    await expect(getAllDeletedDossiers("test-token", 88444)).rejects.toThrow(
      "Invalid deletion pagination",
    );
  },
);
