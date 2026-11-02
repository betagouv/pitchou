import { beforeEach, expect, test, vi } from "vitest";
import type { Knex } from "knex";
import type { SessionUser, UserId } from "@pitchou/types/permissions.ts";
import { getSessionUser } from "../users.ts";
import { requireGroupMember } from "./access.ts";

vi.mock("../users.ts", () => ({ getSessionUser: vi.fn() }));

const actor = 1 as UserId;
const trx = {} as Knex.Transaction;

beforeEach(() => vi.resetAllMocks());

test.each([
  { permissions: [] },
  { permissions: ["dossier:read", "dossier:instruct"] },
  { permissions: ["admin:access"] },
  { permissions: ["groups:manage"] },
  { permissions: ["admin:access", "groups:manage"] },
])(
  "active group membership allows management regardless of permissions: $permissions",
  async (input) => {
    vi.mocked(getSessionUser).mockResolvedValue({
      groupes: [{ id: "group", name: "Groupe" }],
      permissions: input.permissions,
    } as SessionUser);
    await expect(requireGroupMember(actor, "group", trx)).resolves.toBeUndefined();
    expect(getSessionUser).toHaveBeenCalledWith(actor, trx);
  },
);

test.each([null, { groupes: [], permissions: ["admin:access", "groups:manage"] }])(
  "inactive accounts and administrators outside the group cannot write from settings",
  async (user) => {
    vi.mocked(getSessionUser).mockResolvedValue(user as SessionUser | null);
    await expect(requireGroupMember(actor, "group", trx)).rejects.toMatchObject({
      status: 403,
    });
  },
);
