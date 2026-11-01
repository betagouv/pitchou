import { beforeEach, expect, test, vi } from "vitest";
import type { Knex } from "knex";
import type { SessionUser, UserId } from "@pitchou/types/permissions.ts";
import { getSessionUser } from "../users.ts";
import { requireGroupMember, requireMembershipManager } from "./access.ts";

vi.mock("../users.ts", () => ({ getSessionUser: vi.fn() }));

const actor = 1 as UserId;
const trx = {} as Knex.Transaction;

beforeEach(() => vi.resetAllMocks());

test.each([
  { permissions: [], allowed: false },
  { permissions: ["dossier:read", "dossier:instruct"], allowed: false },
  { permissions: ["admin:access"], allowed: false },
  { permissions: ["groups:manage"], allowed: false },
  { permissions: ["admin:access", "groups:manage"], allowed: true },
])("membership management checks both effective permissions: $permissions", async (input) => {
  vi.mocked(getSessionUser).mockResolvedValue({
    groupes: [{ id: "group", name: "Groupe" }],
    permissions: input.permissions,
  } as SessionUser);
  if (input.allowed)
    await expect(requireMembershipManager(actor, "group", trx)).resolves.toBeUndefined();
  else
    await expect(requireMembershipManager(actor, "group", trx)).rejects.toMatchObject({
      status: 403,
    });
  expect(getSessionUser).toHaveBeenCalledWith(actor, trx);
  await expect(requireGroupMember(actor, "group", trx)).resolves.toBeDefined();
});

test.each([null, { groupes: [], permissions: ["admin:access", "groups:manage"] }])(
  "inactive accounts and administrators outside the group cannot write from settings",
  async (user) => {
    vi.mocked(getSessionUser).mockResolvedValue(user as SessionUser | null);
    await expect(requireMembershipManager(actor, "group", trx)).rejects.toMatchObject({
      status: 403,
    });
  },
);
