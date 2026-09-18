import { expect, test, vi } from "vitest";
import { updateNotification } from "./synchronization-notification.ts";
import { markDossiersUnreadForFollowers } from "@pitchou/server/database/notification.ts";
import type { Knex } from "knex";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
vi.mock("@pitchou/server/database/notification.ts", () => ({
  markDossiersUnreadForFollowers: vi.fn(),
}));

test("out-of-batch dossiers changed through a shared company also notify their followers", async () => {
  const trx = {} as Knex.Transaction;
  await updateNotification(
    [{ number: 101 } as DossierDS88444],
    new Map([[101, 1 as DossierId]]),
    new Set([1, 2] as DossierId[]),
    trx,
  );
  const [changes, connection] = vi.mocked(markDossiersUnreadForFollowers).mock.calls[0];
  expect([...changes.keys()]).toEqual([1, 2]);
  expect(connection).toBe(trx);
});
